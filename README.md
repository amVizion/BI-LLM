# BI-LLM

*Democratize data analysis*


BI-LLM automates data analysis workflows using LLMs, and machine learning methods. 

It is web-native, fully-developed on Typescript. It also runs locally, powered by Ollama, and requires no advanced knowledge of data science.

BI-LLM labels texts, and groups them by similarity. Then, it uses the labels to generate a report that explains certain outcome. The report can be used to inform decisions, draft an email, setup a meeting, or kickstart a formal analysis around specific questions. 

The image on the left shows the data processing pipeline. The image on the right the prompting sequence that leads to the report. 

![docs/BI-LLM.png](docs/BI-LLM.png)

A sample of the report generated can be found in the `docs/demos` folder. You can see a demo of the proyect in [YouTube]().


## Getting Started

### Prerequisites
* Ollama running on port `11434`
* Typescript and `ts-node`
* Create a `lib/config.json` based on `lib/config.example.json`
* JSON data file with the following structure:
```json
[
  {
    "text": "One of many texts to be labeled",
    "output": "The outcome we are interested in predicting or explaining"
  }
]
```
### Start the analysis
Navigate to directory: `cd lib/pipelines`

Install dependencies: `npm install`

Run the analysis: `ts-node index.ts`

### Visualize the results

Navigate to app directory: `cd app`

Install dependencies: `npm install`

Start react app: `npm run dev`

## Roadmap



## Contributing

TBD.
