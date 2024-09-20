### The Problem

The entire analysis depends on the labelling step, and hile the labeling pipeline provides a good customer experience going from data to insights in a single CLI commands. The process is slow, and the selected labels suboptimal. Additionally, the attribute store is a key requirement to enable a web-hosted version of the library.

Problems on the quality relate to duplicated lexems like "Curious", and "Curiousity". They also suffer from hallucinations of the model providing generic, or non-value providing labels like "YouTube" or "Views" when describing what drives engagement for YouTube titles. The attributes may also lack the required specifity, and granularity that what LLM can provide. For example, when asking about entities in the videos the context size of maximum 12 LLMs can provide is far too insufficient to accurately express the  diversity required to accurately describe a video based on labels, and attributes. Lastly, some labels lack descriptiveness. For example, the term "Life" is unclear what it entails, diminishing the performance of the analysis.

The problems affecting speed are mainly due to slow inference latencies of LLMs. The labelling pipeline last 5 seconds per each execution, but the scoring can be more than 30 seconds. This also limits the amount of data that can be labeled, affecting the accuracy of the predictors. Reusing labels could even benefit the speed of configuration. For example, once defined the verticals attributtes could be selected automatically, or even intelligently. 

### Proposed Solution

Training is idempotent. This means that the results can be fully reproduced based on the available data, except when there is randomness involved. For example, when querying an LLM. It starts by storing the PCA model, including the texts used to train it. Is important to store the PCA model so that it can be reused for inference. The same is required for the labels, and its predictors. Scores are also important, but mainly if retraining is required. For example, to improve results based on innacurate results on downstream tasks. A suggested approach would be to have independent stores for each attribute. This modular approach would enable extensibility to incorporate causal knowledge about the impact of attributes on outputs, even before federate learning is implemented. Storing the results could even enable a RAG approach where relevant results are retrieved to enhance the analysis. This could be triggered by a multiagentic workflow.

A feasible approach to the multiagentic, federate future could be in providing analysis by labels, or verticals. This could include conditional statistics based on attributes upon request via the web, or on the config. For example, the attributes that contribute most significantly to the explain the performance of a given outcome in a dataset or dataset could be identified, highlighted, and prompted for an explanation. A consequent web experience would enable the exploration of the insights. As a first step defined the end-to-end custoemr experience that motivates the analysis with specifc questions based on the priority industry verticals: finance, and social media marketing.

### Technical challenges

- Begin the storage development locally, but make it easy to migration to a database solution later.
- Consequently, training data cannot be committed but the results should be capable of being reused without the database. This is the beginning of federated learning.  
- Define terminology, and refactor code to differentiate between labelling (within pipeline), and attributes (to describe data items).  

### Development Roadmap

- [x] PCA models are stored with associated texts. Training results can be reproduced.
- [x] PCA models can be retrieved, and reused via the config for the training of new attributes.
- [x]  Labelling pipeline results are stored by prompt, and vertical. Full results allow for manual selection.
- [x] Scores for a given attribute are also stored with associated texts. Training is extensible to include new data.
- [x] Attribute predictors are stored, and commited to GIT so that they can be reused for new analysis.
- [ ] Each attribute contains a description by summarizing the texts that correlate the most with the attribute. 
- [x] The attributes are groupped by uniquely identified verticals which can be reused on the config for rapid analysis.
- [ ] First version of an analysis by attribute or vertical is provided to explain the conditions, and contribution to the outcome.
- [ ] Associated statistics support the analysis by attribute. They are displayed on tables motivated by customer use cases.
- [ ] Attribute definitions are enhanced by visualization to understand the performance of items, and composition of clusters.

### Backlog

- [ ] RAG support that retrieves relevant results by attribute for parallel analysis.
- [ ] The analysis of most relevant attributes is intelligently triggered based on stats, and customer use cases.
- [ ] A multiagentic framework triggers, and retrieves analysis of labels to include on the main report.
- [ ] Attributes are used to segment the vector space, cluster items, visualize insights, and provide community summaries.
- [ ] Entities, and liniks derived from the attributes are the beginning of a knowledge graph to support formal reasoning.
 