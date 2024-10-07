# Attribute Store

- Create an `nlp` directory. This will be used for training, as opposed to the lib directory which is used for inference.
- Some of the later analysis features, like finding causal relationships by attribute will be called by the app via an `API`. Functions will be imported from the lib directory.
- When possible functions between the lib, and nlp directories with deference to the lib directory. Later, a `cli` directory will be implemented as a wrapper to abstract the complexity to the user. However, duplication of code will be tolerate to prioritize speed, and flexibility of development.
- The config will be updated to provide the option to skip the labeling, and scoring steps. As well as selecting the attributes by vertical.
- For now, only models required for inference will be committed to GIT. PCA models will be ignore, and stored locally while linear-regression predictors commited & stored by vertical. Minification may be enforced, along with package-lock.json.
- A `data` directory will be created to commit the `AttributeStore`, and enable reusing it for inference.

## NLP CLI

- [ ] `nlp label`: wil receive the data, embed it, and find labels for a given prompt. The PCA model can be reused, and there is a storage structure for manually selecting the labels, possibly associated by vertical.

- [ ] `nlp score`: given a vertical or labels, plus embedded texts call Ollama to score the texts. Then train predictors, and store them in the data directory. Provide the option to retrain the predictors, based on new data, but reusing the original texts. 


## Development checklist

- [ ] Labeling:
    - [ ] Embed texts.
        - [x] Store PCA model.
        - [ ] Reuse PCA model.
    - [x] Label texts.
    - [x] Store selected labels.
    - [x] Reuse config & lib functions.
    - [x] Store texts, with embeddings to reproduce training.

- [ ] Scoring:
    - [x] Call Ollama.
    - [x] Train predictors.
    - [x] Store predictors.
        - [ ] Reuse predictors on inference pipeline.
        - [ ] Group attributes by vertical.
    - [ ] Enable retraining of predictors.

## Verticals Analysis

- [ ] Vertical has a front-end.
    - [ ] Has a chart showing the different attributes.
    - [ ] Has a dictionary of the attributes, and definitions.
- [ ] Can be moved by analysis by vertical.

