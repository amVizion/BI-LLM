/*
    1. Read config.
    2. Embed texts.
    3. Reduce embeddings (reuse model).
    4. Predict scores.
    5. Cluster & correlate.
    6. Write report
*/

import { ATTRIBUTE_STORE_PATH, readConfig, iConfig, getVerticalLabels } from './pipelines/index'
import { iEmbeddedText, iLabeledText, tScore } from './utils/types' // Import the iConfig type
import { embed, reduce } from './pipelines/1.ERL'
import { clusterTexts } from './pipelines/2.SPC'
import { cdvPipeline } from './pipelines/3.CDV'
import { readFileSync } from 'fs'

import MLR from 'ml-regression-multivariate-linear'

export const predictScores = async(texts:iEmbeddedText[], config:iConfig) => {
    const { verticals } = config
    const verticalLabels = getVerticalLabels(verticals)

    // Get predictor.
    const getPredictor = (vertical:string) => {
        const predictorPath = `${ATTRIBUTE_STORE_PATH}/${vertical}/predictor.json`
        const predictorBuffer = readFileSync(predictorPath)
        const predictor = JSON.parse(predictorBuffer.toString())

        const labels = verticalLabels[vertical]
        return {predictor, labels}
    }

    // Predict scores.
    interface iPredictedTexts extends iEmbeddedText { 
        labels?: tScore[]
        verticalLabels?: {[vertical:string]:tScore[]} 
    }

    const predict = (texts:iPredictedTexts[], vertical:string) => {
        const {predictor, labels} = getPredictor(vertical)

        const mlr = MLR.load(predictor)
        const x = texts.map(({ embeddings }) => embeddings)
        const predictions = mlr.predict(x)

        const scoredTexts:iLabeledText[] = texts.map((t, i) => {
            const scores = labels.map((label, j) => ({label, score: predictions[i][j]}))
            const verticalLabels = { ...(t.verticalLabels || {}), [vertical]:scores }
            return { ...t, labels:[...(t.labels || []), ...scores], verticalLabels }
        })

        return scoredTexts
    }

    // Iterate by vertical
    const labeledTexts = verticals.reduce((acc, vertical) => predict(acc, vertical), texts)
    return labeledTexts as iLabeledText[]
}

const index = async() => {
    // Read config.
    const {config, texts} = await readConfig()

    // Embed & reduce texts.
    const embeddedTexts = await embed(texts, config)
    const reducedEmbeddings = await reduce(embeddedTexts, config)

    // Numerical analysis.
    const scoredTexts = await predictScores(reducedEmbeddings, config)

    const { clusteredTexts, clusters } = await clusterTexts(scoredTexts, config)
    await cdvPipeline(clusteredTexts, clusters, config)
}

// index().catch(console.error)
