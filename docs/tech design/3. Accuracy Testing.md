# Accuracy testing

Given a report, ask to make a prediction.

Possible enhancements:

- [ ] Output that includes the average value, the expected peformance, and the prediction.
- [ ] Introduction that talks about the content, and provides average (expected) performance. Even outliers.
- [ ] A/B testing where the contribution of each section is evaluated. Value assesed by latency.
- [ ] Prediction that includes reasoning. Multi-agent system, with analyst, predictor, and reviewer.
- [ ] Convert values to a logarithmic scale (how to handle report?).

## Workflow

1. Loop that makes N predictions.
2. Retrieve all the data, select a random title.
3. Prepare prompt based on the report.
4. Make prediction, and store the result.
5. Summarize findings in JSON.
