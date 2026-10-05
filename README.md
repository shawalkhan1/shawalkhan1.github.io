# Shawal Latif

Personal research and engineering website: [shawalkhan1.github.io](https://shawalkhan1.github.io/).

The homepage introduces the research direction and selected work. Nine pages in `projects/` provide the problem, contribution, approach, evidence, limitations, and next questions for each project.

## Updating the site

- Edit the introduction, research interests, publication status, and background in `index.html`.
- Edit project narratives in their corresponding `projects/*.html` files. Keep reported results distinct from diagrams and prototypes.
- Shared typography and responsive layouts are in `assets/css/academic.css`; existing component styles are in `base.css` and `edge-project.css`.
- `assets/js/academic.js` enhances menus and method explorers. The compression chart reads its values directly from the report table in its project page. The downloadable CSV in `assets/data/` reproduces that table.
- The campus simulation loads only on the SYNQ page. It is an illustrative browser animation, not a live LLM experiment.
- `assets/reports/llm-compression-report.pdf` is the public course report. The CV remains at `Shawal_Latif_CV.pdf`.

## Local preview

From the repository root, run `python -m http.server 8000` and open `http://localhost:8000/`. No build step or JavaScript framework is required. Reading, links, and native disclosure sections work without JavaScript.

GitHub Pages publishes the `main` branch. Existing links to `#llm-compression` lead to the compression case study; background anchors open their relevant disclosure sections.
