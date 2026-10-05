(function () {
  'use strict';
  var CORPUS = [
    {id:"compression",tags:"compression edge efficient cpu llama pruning lora quantization gguf memory award runtime",text:"My AI on Edge Devices course project compressed LLaMA-2-7B and adapted llama.cpp for non-uniform layer dimensions. The report records a 2.10 GB Q2_K artifact versus 25.10 GB for FP16, and 45.9 tokens per second for pruning alone versus 36.8 for FP16. I received the Best Project Award for the lowest perplexity and highest accuracy on the course leaderboard."},
    {id:"interests", tags:"research interests human interaction efficient edge compression quantization multimodal on-device trustworthy responsible agentic oversight agency power healthcare social impact simulation", text:"My research lies at the intersection of Human-AI Interaction, Efficient & Edge AI, Responsible AI, and AI for Social Impact. I study human-centered and efficient AI; trustworthy, responsible and agentic AI; AI for healthcare and social impact; and human-centered AI and social simulation. My central question is how AI can remain capable, trustworthy, and useful when computation, connectivity, data, and expert access are limited."},
    {id:"deploy",  tags:"deploy production sagemaker fastapi endpoint serve serving ship cloud aws docker", text:"I deploy fine-tuned models as real-time AWS SageMaker endpoints behind a FastAPI microservice, containerized with Docker, with a LangGraph agentic-RAG pipeline serving requests."},
    {id:"serving", tags:"inference optimization latency throughput vllm tgi tensorrt quantization gptq awq gguf speculative flash attention kv cache batching speed fast", text:"For inference I use quantization (GPTQ, AWQ, GGUF), speculative decoding, Flash Attention, KV-cache optimization, and continuous batching, and I benchmark vLLM, TGI, and TensorRT-LLM to choose the fastest serving stack."},
    {id:"finetune",tags:"fine-tuning finetune training qlora lora dpo rlhf alignment llama trl unsloth dataset instruction tune", text:"I fine-tune models like Llama 3.1 8B with QLoRA/LoRA using PyTorch, Hugging Face Transformers, TRL, and Unsloth on custom instruction datasets, then align them with Direct Preference Optimization (DPO/RLHF)."},
    {id:"rag",     tags:"rag retrieval augmented generation qdrant vector database reranking hybrid search query expansion self-querying embeddings context cdc bytewax", text:"My RAG pipelines use a Qdrant vector database with query expansion, self-querying, hybrid search, and cross-encoder reranking, kept fresh in real time via Change-Data-Capture and Bytewax streaming."},
    {id:"mlops",   tags:"mlops llmops pipeline zenml ci cd ct github actions monitoring observability drift opik retraining automation fti", text:"I build on the Feature/Training/Inference (FTI) pipeline pattern orchestrated with ZenML, automate CI/CD/CT with GitHub Actions, and add observability with Opik plus data and concept drift detection."},
    {id:"eval",    tags:"evaluation eval ragas llm-as-a-judge metrics benchmark quality measure comet", text:"I evaluate LLMs with LLM-as-a-judge and RAGAS metrics tracked in Comet ML, and for research I build clinician-validated benchmarks scoring models on clinical correctness, fairness, and helpfulness."},
    {id:"role",    tags:"job role work current awaaz sehat maternal health gates foundation lums voice experience now do", text:"I am a Full-Stack AI Engineer on Awaaz-e-Sehat, Pakistan's first voice-first LLM maternal-healthcare assistant for low-literacy women, developed at the National AI Hub, LUMS. My work focuses on multilingual evaluation, fairness, safety, linguistic disparities, and efficient deployment in low-connectivity environments."},
    {id:"research",tags:"research phd publications papers acl chi facct benchmark fairness maternal global south study academic researching", text:"My research manuscripts target BenchMaterna (ACL 2027), a benchmark of 30+ LLMs on maternal health; the Awaaz-e-Sehat system paper (CHI 2027); and a clinical fairness audit of frontier LLMs (FAccT 2027)."},
    {id:"fairness",tags:"fairness bias equity auditing rcr rcer triage roman urdu code-mixed demographic intersectional safety", text:"I audit the clinical fairness of frontier LLMs using perturbation benchmarks across Roman Urdu, code-mixed language, and intersectional demographics, and developed metrics like Reduced Care Rate, Reduced Care Error Rate, and Triage Threshold Shift."},
    {id:"edu",     tags:"education degree study masters ms ai lums comsats electrical engineering background", text:"I hold an M.S. in Artificial Intelligence from LUMS and a B.S. in Electrical Engineering from COMSATS University Islamabad."},
    {id:"teaching",tags:"teaching teach ta assistant course courses lecture mentor students mathematics probability statistics vision language human centered social impact lums topics llm award best", text:"I am a Graduate Teaching Assistant at LUMS for six graduate-level (5000) courses spanning the full AI stack — Mathematics for AI, Probability & Statistics, AI for Social Impact, Human-Centered AI, Vision-Language Models, and Topics in Large Language Models — leading recitations, designing assignments, and mentoring 200+ students. I was awarded the Best TA Award for Mathematics for AI."},
    {id:"projects",tags:"projects portfolio nba basketball gan audio rocky bot text-to-sql alphazero neat side build", text:"My projects span 3D NBA reconstruction, a differentiable basketball RL environment, GAN audio source separation, a LangChain news bot, a text-to-SQL system, and from-scratch reimplementations of AlphaZero and NEAT."},
    {id:"stack",   tags:"skills stack tools languages python pytorch frameworks technologies use know", text:"My core stack is Python and PyTorch with the Hugging Face ecosystem, LangChain/LangGraph, Qdrant, ZenML, Docker, FastAPI, and AWS, plus SQL, MongoDB, and streaming tools for data."},
    {id:"synq",    tags:"synq startup venture founder company building compatibility dating matching social product idea business clone agent orchestrator funding investor seed", text:"I founded SYNQ, an early-stage project at the LUMS Centre for Entrepreneurship. It explores how grounded digital twins and multi-agent interactions might support human connection, with consent, behavioral fidelity, and human oversight as design questions."}
  ];


  var form = document.getElementById('ask-form');
  var input = document.getElementById('ask-input');
  var chips = document.getElementById('ask-chips');
  var results = document.getElementById('ask-results');
  if (!form || !input || !chips || !results) return;
  var stop = new Set('the a an is are do you your me my of to for in on and what how with about tell whats can have that this it'.split(' '));
  var destinations = { compression: 'projects/llm-compression.html', interests: '#research', role: 'projects/awaaz-e-sehat.html', research: '#publications', fairness: 'projects/clinical-fairness.html', edu: '#education', teaching: '#teaching', projects: '#projects', synq: 'projects/synq.html', stack: '#skills', deploy: 'projects/llm-twin.html', serving: 'projects/llm-twin.html', finetune: 'projects/llm-twin.html', rag: 'projects/llm-twin.html', mlops: 'projects/llm-twin.html', eval: 'projects/benchmaterna.html' };
  function ask(query) {
    query = query.trim();
    if (!query) return;
    input.value = query;
    var words = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (word) { return word && !stop.has(word); });
    var hits = CORPUS.map(function (fact) {
      var score = words.reduce(function (sum, word) { return sum + (fact.tags.indexOf(word) >= 0 ? 2 : 0) + (fact.text.toLowerCase().indexOf(word) >= 0 ? 1 : 0); }, 0);
      return { fact: fact, score: score };
    }).filter(function (hit) { return hit.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 2);
    results.replaceChildren();
    if (!hits.length) {
      var empty = document.createElement('p'); empty.className = 'ask-empty';
      empty.textContent = 'Try a suggested question, or explore the project pages above.';
      results.appendChild(empty); return;
    }
    hits.forEach(function (hit) {
      var card = document.createElement('div'); card.className = 'ask-doc';
      var copy = document.createElement('p'); copy.className = 'ask-doc-text'; copy.textContent = hit.fact.text;
      card.appendChild(copy);
      if (destinations[hit.fact.id]) {
        var link = document.createElement('a'); link.href = destinations[hit.fact.id]; link.className = 'work-link';
        link.textContent = 'Explore related work'; card.appendChild(link);
      }
      results.appendChild(card);
    });
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); ask(input.value); });
  chips.addEventListener('click', function (event) { var button = event.target.closest('.ask-chip'); if (button) ask(button.textContent); });
  form.hidden = false; chips.hidden = false;
})();
