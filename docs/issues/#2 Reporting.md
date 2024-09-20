# Enhance reporting: Split descriptive from diagnostic sections

### The problem

The quality of current research is not satisfactory. Formatting is not consistent, there are no quality controls, and some use cases are not supported. For example, content requirements are different on the web dashboard, that on the the full report. 

Today, the composition of clusters can not be known in the dashboard without going through the numerical outputs. The content in the report is repetitive, making it longer than necessary, and not allowing for a larger number of clusters. Titles are not provided for clusters, and titles provided for the report are of inconsistent quality. Including the purpose of the research for every prompt also leads to unnecessary repetition, and missing the main point of specific paragraphs of the research. Lastly there are minor use cases when the report is a bottleneck to iterate on the visualization of the data.

Finally, the recent enhancement of verticals are not yet incoporated into the report. Providing a disorganized reader experience. 

### Proposed solution

The solution is to split the report into two sections: descriptive and diagnostic. The descriptive section will contain the main labels that characterize each cluster. The diagnostic section will explain the correlation between the labels, and output, the ranking between clusters, and when verticals are provided the relative importance of each vertical.

Additionally, separate prompts will support the web dashboard. This includes generating separate diagnostic paragraph for each cluster, and naming each cluster to display them within the charts. Quality controls similar to the ones when scoring, and labeling will be implemented to ensure specific outputs like titles match required criteria. Similarly, prompts where the purpose of the analysis will will be reviewed to minimize repetition. A final enhancement will provide an option in the config to skip reporting. 

If there is available time it can be spent exploring the written analysis of labels, enhancing the quality of the analysis with multiagent societies, or working on the roadmap.


### Development roadmap

- [ ] Descriptive section: iterate through each cluster.
- [ ] Labels correlation analysis.
- [ ] Ranking between clusters.
- [ ] Contribution of each vertical.
- [ ] Reuse diagnostic cluster paragraphs for web dashboard.
- [ ] Include textbox when selecting a cluster on chart.
- [ ] Clusters titles.
- [ ] Quality control on report titles.
- [ ] Remove redundant inclusion of research purpose on prompts.
- [ ] Skip report option on config.






## Reading list

# September 1st week: Reading List

- [ ] Meta-prompting & self-optimization.
- [ ] Federated Learning with LLMs.
- [ ] Finetunning LLMs.
- [ ] Instruction tunning RFL.
- [ ] Finance paper (HyperGraph source).

## Backlog
- [ ] From local-to-global: RAG summarization.
- [ ] RAG for multimodal data.
- [ ] Customer service (LinikedIn).


## TODO: List

------------------------------------

LinkedIn
- [ ] VC Mexico-LA.
- [ ] Elia.
- [ ] Elias.
- [ ] LinkedIn event.
- [ ] Carlos
- [ ] Rafael (early customer).

YouTube
- [ ] Short I.
- [ ] Short II (Saturday morning).
- [ ] Video.

Github
- [ ] Push.
- [ ] Issue.


-------------------------------------

Elia
1. LinkedIn/Zoom.
2. Leads.
3. Audiencia.
4. 





