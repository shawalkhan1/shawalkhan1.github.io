/* Recorded results only. The report table is the numeric source of truth. */
(function () {
  'use strict';
  var root = document.getElementById('llm-compression');
  if (!root) return;
  var rows = Array.from(root.querySelectorAll('.edge-table tbody tr'));
  var names = ['FP16', 'Pruned', 'Q8_0', 'Q4_K_M', 'Q2_K'];
  var data = rows.map(function (row, i) {
    var cells = Array.from(row.querySelectorAll('td')).map(function (cell) { return Number(cell.textContent); });
    return { name: names[i], ppl: cells[0], speed: cells[1], memory: cells[2], size: cells[3] };
  });
  if (data.length !== 5 || data.some(function (d) { return ['ppl', 'speed', 'memory', 'size'].some(function (key) { return !Number.isFinite(d[key]) || d[key] <= 0; }); })) return;
  var base = data[0];
  var configButtons = Array.from(root.querySelectorAll('[data-config]'));
  var measures = Array.from(root.querySelectorAll('[data-metric]'));
  var stageButtons = Array.from(root.querySelectorAll('[data-stage]'));
  var stages = [
    { label: '01 / Pruning', title: 'Remove parameters. Expose a runtime constraint.', copy: 'The pipeline targets 30% pruning. The resulting layers can have different dimensions, so the compressed model cannot simply rely on a single global shape configuration.', input: 'LLaMA-2-7B', transform: 'Pruning · 30% target', output: 'Non-uniform layers' },
    { label: '02 / Quality recovery', title: 'Recover quality without retraining every weight.', copy: 'LoRA fine-tuning on Alpaca-cleaned follows pruning. The report describes using higher adapter ranks for more aggressive pruning, with gradient clipping and NaN checks to keep training stable.', input: 'Pruned weights', transform: 'LoRA fine-tuning', output: 'Recovered model' },
    { label: '03 / Quantization', title: 'Spend fewer bits where the model can afford it.', copy: 'Activation smoothing addresses outliers before quantization. The report explores sensitivity-based precision allocation and GGUF formats; the measurements below show the quality and resource tradeoffs between configurations.', input: 'Activation calibration', transform: 'Precision allocation', output: 'Quantized GGUF' },
    { label: '04 / Runtime integration', title: 'Supporting layers with different shapes.', copy: 'I adapted llama.cpp to read per-layer dimensions from GGUF tensor shapes and pass them to the graph builder, supporting layers with different attention and feed-forward dimensions.', input: 'GGUF tensor shapes', transform: 'Per-layer dimensions', output: 'Graph construction' }
  ];
  function fixed(value, key) { return value.toFixed(key === 'speed' ? 1 : 2); }
  function reduction(value, baseline) { return (100 * (1 - value / baseline)).toFixed(1); }
  function selectConfig(index) {
    var d = data[index];
    configButtons.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === index)); button.classList.toggle('is-active', i === index); });
    rows.forEach(function (row, i) { row.classList.toggle('is-selected', i === index); });
    measures.forEach(function (card) {
      var key = card.dataset.metric, value = d[key], diff = value - base[key];
      var max = Math.max.apply(null, data.map(function (entry) { return entry[key]; }));
      var unit = key === 'speed' ? ' tok/s' : key === 'ppl' ? '' : ' GB';
      card.querySelector('[data-value]').textContent = fixed(value, key);
      card.querySelector('[data-bar-value]').textContent = fixed(value, key) + unit;
      card.querySelector('[data-bar-name]').textContent = d.name;
      card.querySelector('[data-bar]').style.width = (value / max * 100) + '%';
      card.querySelector('.edge-bar-base').style.width = (base[key] / max * 100) + '%';
      var delta = card.querySelector('[data-delta]');
      delta.dataset.trend = diff === 0 ? 'same' : (key === 'speed' ? diff > 0 : diff < 0) ? 'better' : 'worse';
      if (!index) delta.textContent = 'Reference configuration';
      else if (key === 'ppl') delta.textContent = (diff > 0 ? '+' : '') + diff.toFixed(2) + ' perplexity';
      else if (key === 'speed') delta.textContent = (100 * Math.abs(diff) / base[key]).toFixed(1) + '% ' + (diff > 0 ? 'faster' : 'slower');
      else delta.textContent = reduction(value, base[key]) + '% ' + (key === 'size' ? 'smaller' : 'less memory');
    });
    var notes = [
      'The reference run: ' + fixed(base.size, 'size') + ' GB on disk and ' + fixed(base.memory, 'memory') + ' GB peak memory. It has the lowest perplexity in this table, at ' + fixed(base.ppl, 'ppl') + '.',
      'The fastest configuration in this table: ' + (d.speed / base.speed).toFixed(2) + '× baseline throughput. Pruning alone still leaves a ' + fixed(d.size, 'size') + ' GB artifact, with perplexity at ' + fixed(d.ppl, 'ppl') + '.',
      'A smaller artifact does not guarantee faster inference. Q8_0 uses ' + fixed(d.memory, 'memory') + ' GB peak memory, but records ' + fixed(d.speed, 'speed') + ' tok/s versus ' + fixed(base.speed, 'speed') + ' for FP16.',
      'A smaller footprint, with a speed tradeoff: ' + reduction(d.size, base.size) + '% less storage and ' + reduction(d.memory, base.memory) + '% less peak memory, but ' + reduction(d.speed, base.speed) + '% lower throughput than FP16. Perplexity rises from ' + fixed(base.ppl, 'ppl') + ' to ' + fixed(d.ppl, 'ppl') + '.',
      'The smallest artifact in this table: ' + fixed(d.size, 'size') + ' GB, with ' + fixed(d.memory, 'memory') + ' GB peak memory. That comes with the highest perplexity, ' + fixed(d.ppl, 'ppl') + ' versus ' + fixed(base.ppl, 'ppl') + ' for FP16.'
    ];
    root.querySelector('#edge-config-title').textContent = d.name;
    root.querySelector('#edge-config-note').textContent = notes[index];
  }
  function selectStage(index) {
    var d = stages[index];
    stageButtons.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === index)); button.classList.toggle('is-active', i === index); });
    ['label', 'title', 'copy'].forEach(function (key) { root.querySelector('#edge-stage-' + key).textContent = d[key]; });
    ['input', 'transform', 'output'].forEach(function (key) { root.querySelector('#edge-shape-' + key).textContent = d[key]; });
  }
  function bindGroup(buttons, select) {
    buttons.forEach(function (button, index) {
      button.disabled = false;
      button.addEventListener('click', function () { select(index); });
      button.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault(); buttons[next].focus(); select(next);
      });
    });
  }
  bindGroup(configButtons, selectConfig);
  bindGroup(stageButtons, selectStage);
  selectConfig(3);
  root.querySelectorAll('.edge-enhanced').forEach(function (element) { element.hidden = false; });
})();
