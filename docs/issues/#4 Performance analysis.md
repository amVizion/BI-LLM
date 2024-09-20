# Performance Analysis

### Problem Statement:

Today, we have a pipeline to automate reporting, and a database of attributes to accelerate, and improve the quality of the analysis. However, the application of the library is a missing a clear business-oriented outcome.

A second problem of existing analysis is that since they have been performed over a large volume of items, the variability among outcomes lacks explanaibility. This is amplified by the fact that there are no indicators of the accuracy in predictions, making the results not trustworthy.

The final problem that prevents the existing analysis to be drive business decisions is that it is static. Once the analysis is completed, there is little to do, beyond reading it, and diving on the data, and charts to create a deeper understanding.

### Solution Overview

Analysis will be made on YouTube channels based on the data, and attributes collected. There are three main goals of the analysis: a) incorporate the vertical attributes into the analysis, b) prepare a dynamic customer experience that can be reused via the webApp, and c) inform predictions based for the research paper.

Solution will start by reusing existing pipeline, but integrating it with verticals for accelerated inference on a single channel data. From there an analysis by vertical will be incorporated into the report. Next, data into the tables will be made available to further enhance the analysis. Finally, if necessary charts, and tables by vertical will be supplied to inform causal relations between the text, and the outcome.

As a final step to demonstrate the business value of the analysis, the research will be supplied to GPT-4 to make informed predictions of unseen videos, and predict the outcome. A simple comparisson will be drawn against a baseline with the expected views from the channel. For that, is important to supplement the report with views above expectation for each individual cluster, and for each video (based on embeddings). As a posible last step include the representation of the optimal weights within the analysis to explain how each dimension contributes to the outcome of the video.

Development Roadmap
- [x] Update pipeline to support AttributeStore.
- [x] Analysis by vertical on BI report.
- [x] Enhance tables to show vertical on predictions.
- [ ] New views by vertical to correlate attributes.
- [x] Expected performance on report, and tables.
- [x] Validate report value with experiment on ChatGPT.
