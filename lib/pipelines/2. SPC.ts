/*

Score Predict Cluster (SPC) pipeline:

1. Score:
    1.1. If predictors available, skip.
    1.2. Else, sample texts.
    1.3. Call LLM.
        1.3.1. Handle error.
    1.4 Store scores.
    TODO: Handle normalization when moving to semi-structured data.

2. Predict: 
    2.1. Train or load predictors.
    2.2. Extend text objects with predicted scores.
    2.3. Store predictions, and models if trained.

3. Cluster:
    3.1. Cluster texts.
    3.2. Dimensionality reduction.
    3.3. Store clusters.

Stored outputs:
    - Scores.
    - Texts with Predictions.
    - Predictors.
    - Clusters.

Inputs: 
    - Texts with reduced embeddings.
    - Labels.
    - Predictor models.

Outputs:
    - Texts with scores & clusters.
    - Clusters with texts.

*/

import { iLabeledText, iEmbeddedText, iScoredText, iResearchContext } from '../utils/types'
import { iRawCluster, iClusteredText, tVerticalLabels } from '../utils/types'
import { getScorePrompt } from '../utils/prompts'
import { getSampleTexts } from '../utils/utils'
import { callOllama } from '../utils/ollama'

import MLR from 'ml-regression-multivariate-linear'
import { kMeansCluster } from 'simple-statistics'
import { writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { PCA } from 'ml-pca'


export interface iSpcConfig {
    path: string
    labels: string[]
    verticals?: string[]
    verticalLabels?: tVerticalLabels

    itemsToScore?: number
    scorePrompt?: string

    numClusters?: number

    predictor?: MLR // TODO: Implement.
    context: iResearchContext
}

const TEXTS_PATH = 'B.4. LabeledTexts.json'
const CLUSTERS_PATH = 'B.6. Clusters.json'

const getScores = async(texts:iEmbeddedText[], config:iSpcConfig) => {
    const { predictor, scorePrompt:intro, context, itemsToScore=100 } = config
    const { path, labels:attributes } = config
    const { itemName } = context

    if(predictor) return []
    if(!attributes) throw new Error('Labels not provided.')

    const rawScores:any[] = []

    // Call Ollama to get scores.
    const scoreText = async(text:string) => {
        const prompt = getScorePrompt({ intro, attributes, text, itemName })

        // Test output.
        try {
            const scoreOutput = await callOllama(prompt)
            const jsonScore = JSON.parse(scoreOutput)

            rawScores.push({text, score:jsonScore})

            // Validate jsonScore has all labels.
            const hasAllLabels = attributes.every(a => jsonScore[a] !== undefined)
            if(!hasAllLabels) throw new Error('Missing labels in output.')

            // Validate jsonScore has no extra labels.
            const hasNoExtraLabels = Object.keys(jsonScore).every(k => attributes.includes(k))
            if(!hasNoExtraLabels) throw new Error('Extra labels in output.')

            // Validate all values are numbers.
            const allValuesAreNumbers = Object.values(jsonScore).every(v => typeof v === 'number')
            if(!allValuesAreNumbers) throw new Error('Non-numeric values in output.')

            // Map jsonScore to tScore.
            const scores = attributes.map(a => ({ label:a, score:jsonScore[a] }))
            return scores
        } catch(e) {}
    }

    // Sample texts to score.
    const scoredTexts:iScoredText[] = []
    const sampleTexts = getSampleTexts(texts.map(({ text }) => text), itemsToScore)
    const textsToScore = sampleTexts.map(t => texts.find(({ text }) => text === t)!) // TODO: Refactor.

    for (const text of textsToScore) {
        const scores = await scoreText(text.text)
        if(!scores) continue

        scoredTexts.push({ ...text, scores })
    }

    // Store scores.
    const jsonRawScores = JSON.stringify(rawScores, null, 4)
    await writeFile(`${path}/B.0. RawScores.json`, jsonRawScores)

    const jsonScores = JSON.stringify(scoredTexts, null, 4)
    await writeFile(`${path}/B.1. Scores.json`, jsonScores)

    return scoredTexts
}

const predictLabels = async(texts:iEmbeddedText[], scoredTexts:iScoredText[], config:iSpcConfig) => {
    const { path, labels, predictor } = config
    if(!labels) throw new Error('Labels not provided.')
 
    // For each label, get a score based on annotated data.
    const trainPredictors = async(scoredTexts:iScoredText[], labels:string[]) => {
        const x = scoredTexts.map(({ embeddings }) => embeddings)
        const y = scoredTexts.map(({ scores }) => 
            labels.map(l => scores.find(({ label }) => label === l)!.score)
        )

        const mlr = new MLR(x, y)
        const mlrJson = JSON.stringify(mlr.toJSON(), null, 4)

        await writeFile(`${path}/B.2. Predictors.json`, mlrJson)
        return mlr
    }

    // Make predictions based on text embeddings.
    const makePredictions = async(texts:iEmbeddedText[]) => {
        const x = texts.map(({ embeddings }) => embeddings)
        const y = texts.map(({ output }) => [output])

        const mlr = new MLR(x, y)
        const mlrJson = JSON.stringify(mlr.toJSON(), null, 4)

        await writeFile(`${path}/B.3. Embeddings Predictor.json`, mlrJson)

        const z = mlr.predict(x)
        return z
    }

    interface iPredictTextsInput { texts:iEmbeddedText[], mlr:MLR, labels:string[] }
    const predictTexts = async({ texts, mlr, labels }:iPredictTextsInput):Promise<iLabeledText[]> => {
        const x = texts.map(({ embeddings }) => embeddings)
        const z = mlr.predict(x)

        const labeledTexts = texts.map((t, i) => {
            const scores = z[i]
            const scoreLabeled = labels.map((l, j) => ({ label:l, score:scores[j] }))
            return { ...t, labels: scoreLabeled }
        })

        const predictions = await makePredictions(labeledTexts)
        const predictedTexts = labeledTexts.map((t, i) => ({ ...t, prediction:predictions[i][0] }))

        // TODO: Log & store model errors 
        return predictedTexts
    }

    const mlr = predictor || await trainPredictors(scoredTexts, labels)
    const labeledTexts = await predictTexts({ texts, mlr, labels })

    const jsonLabeledTexts = JSON.stringify(labeledTexts, null, 4)
    await writeFile(`${path}/B.4. LabeledTexts.json`, jsonLabeledTexts)

    return labeledTexts
}

const clusterTexts = async(labeledTexts:iLabeledText[], config:iSpcConfig) => {
    const { path, numClusters } = config

    const embeddings = labeledTexts.map(({ embeddings }) => embeddings)
    const { centroids, labels } = kMeansCluster(embeddings, numClusters || 3)

    // Reduce centroids to 2D for visualization.
    const pca = new PCA(embeddings)
    const reducedCentroids = pca.predict(centroids, { nComponents:2 }).to2DArray()
    const reducedEmbeddings = pca.predict(embeddings, { nComponents:2 }).to2DArray()

    const clusteredTexts:iClusteredText[] = labeledTexts.map((t, i) => ({ ...t, 
        cluster:labels[i], center:reducedEmbeddings[i] 
    }))

    const jsonClusteredTexts = JSON.stringify(clusteredTexts, null, 4)
    await writeFile(`${path}/B.5. ClusteredTexts.json`, jsonClusteredTexts)

    // Clusters with texts
    const clusters:iRawCluster[] = centroids.map((c, i) => ({ index: i, 
        center: reducedCentroids[i],
        centroid: c
    }))

    const jsonCentroids = JSON.stringify(clusters, null, 4)
    await writeFile(`${path}/B.6. Clusters.json`, jsonCentroids)

    return { clusters, clusteredTexts }
}

const iterateVerticals = async(texts:iEmbeddedText[], config:iSpcConfig) => {
    const { verticals = [] } = config

    if(!verticals.length) {
        const scoredTexts:iScoredText[] = await getScores(texts, config)
        const labeledTexts:iLabeledText[] = await predictLabels(texts, scoredTexts, config)
        return labeledTexts
    }

    const verticalTexts:iLabeledText[][] = []

    for (const vertical of verticals) {
        const path = `${config.path}/${vertical}`
        const labels = config?.verticalLabels![vertical]
        const verticalConfig = {...config, path, labels}

        const scoredTexts:iScoredText[] = await getScores(texts, verticalConfig)
        const labeledTexts:iLabeledText[] = await predictLabels(texts, scoredTexts, verticalConfig)
        verticalTexts.push(labeledTexts)
    }

    // Get all labels for each text.
    const labeledTexts:iLabeledText[] = verticalTexts[0].map((t, i) => {
        const allLabels = verticalTexts.map(d => d[i].labels)
        const verticalLabels = verticals.reduce((d, v, j) => ({ ...d, [v]: allLabels[j] }), {})

        return { ...t, labels:allLabels.flat(), verticalLabels }
    })

    await writeFile(`${config.path}/${TEXTS_PATH}`, JSON.stringify(labeledTexts, null, 4))
    return labeledTexts
}

export const spcPipeline = async(texts:iEmbeddedText[], config:iSpcConfig) => {
    // Resume progress
    if(existsSync(`${config.path}/${TEXTS_PATH}`)) {
        const textsBuffer = await readFile(`${config.path}/${TEXTS_PATH}`)
        const labeledTexts = JSON.parse(textsBuffer.toString())

        const { clusters, clusteredTexts } = await clusterTexts(labeledTexts, config)
        return { clusters, clusteredTexts }
    }

    console.log('Starting SPC Pipeline.')
    const labeledTexts = await iterateVerticals(texts, config)
    const { clusters, clusteredTexts } = await clusterTexts(labeledTexts, config)

    return { clusters, clusteredTexts }
}
