# Verticals

## Support multi-label analysis based on distinct prompts

### The problem

When evaluating a set of items, the labels that are generated automatically are useful to do an analysis, but sometimes not enough.

Certain datasets require exploring the items from multiple dimensions "verticals", and evaluating how important is each dimension to the final outcome.

Iterating though the Labeling & Scoring pipeline is not a good enough option, and then feeding the Writing step with the entire array of labels, and predictors is also not an entirely satisfactory option because the report would not group the labels by vertical, and include that in the correlation, and causality explanation.

Some datasets that could benefit from this enhancement include Social Media activity analysis, and Lead Qualification. For example, social media posts may benefit from verticals that include the topic, emotion, engagement, hook, and entities included on the post. For Lead Qualification attributes like professional experience, educational background, personality, and social media activity may contribute to better qualify leads, and understand the ICP (Ideal Customer Profile).

### Proposed Solution

The config is expanded with a verticals array attribute. Then, the labelPrompt attribute could also support arrays with key-value elements, where keys are the vertical, and values the prompts. Thus, the vertical attributes can be reused for other config attributes. The labeling, and scoring pipelines would be iterated for each vertical, reusing the same embeddings. File paths will be updated accordingly by dimension, and consolidated within the existing labels logs. The data structure to consolidate all labels, and scores should preserve verticals.

After data is labeled by verticals, correlation will be extended to compute the rho score for each vertical. The results will be displayed on the web application. On a report with verticals the top table will have the labels, and stats for each vertical based on the totality of item datasets. A second table will be made available when clicking on the graph to display the verticals by cluster.

Default propmpts will differentiate between analysis that contain verticals, and the ones that don't. The prompts when describing, and explaining clusters should incorporate the verticals, and include on the narrative all significant labels for each vertical. The cluster's narrative would also incorporate which are the verticals with the most significance (deviation to the mean), and correlation. In the conclusion an analysis of the causation by verticals will be added to the existing explanation that considers clusters, and labels.

### Development checklist

- [x] Config accepts verticals, and labels.
- [x] Labeling, and scoring iteration by dimension.
- [x] Labels, and scores stored by dimension.

- [x] Correlate outcome by vertical.
- [x] Dataset table with stats by vertical.
- [x] Cluster's table with labels by vertical.
- [ ] Adjust prediction to handle verticals.

- [ ] Labels by vertical on cluster prompts.
- [ ] Vertical influence by cluster on report.
- [ ] Conclusion with vertical correlation by prompt.
