/*

- [ ] Import embeddings.
- [ ] Import labels.
- [ ] Import scores.
- [ ] Train predictors.
- [ ] Store predictors.

*/

import { iEmbeddedText, iScoredText } from '../lib/utils/types'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { predictLabels } from '../lib/pipelines/2.SPC'
import { readConfig, getTrainingPath } from './utils'
import { existsSync } from 'fs'


const index = async() => {
    const { verticalName } = await readConfig()
    const paths = await getTrainingPath(verticalName)

    // 1. Import embeddings.
    const embeddingsPath = `${paths.embeddingsPath}/A.3. ReducedEmbeddings.json`
    const embeddingsBuffer = await readFile(embeddingsPath)
    const embeddings:iEmbeddedText[] = JSON.parse(embeddingsBuffer.toString())

    // 2. Import labels.
    const labelsPath = `${paths.labelsPath}/Labels.json`
    const labelsBuffer = await readFile(labelsPath)
    const labels:string[] = JSON.parse(labelsBuffer.toString())

    // 3. Import scores.
    const scoresPath = `${paths.scoresPath}/Scores.json`
    const scoresBuffer = await readFile(scoresPath)
    const scores:iScoredText[] = JSON.parse(scoresBuffer.toString())

    const predictConfig = { path: paths.predictDir, labels }
    const { predictor } = await predictLabels(embeddings, scores, predictConfig)

    const attributesDir = `../data/attributeStore/${verticalName}`
    const labelsDirExists = existsSync(attributesDir)
    if(!labelsDirExists) await mkdir(attributesDir)

    const predictorPath = `${attributesDir}/predictor.json`
    const attributesPath = `${attributesDir}/labels.json`
    const pcaPath = `${attributesDir}/pca.json`

    const pcaModel = await readFile(`${paths.embeddingsPath}/A.2. PCA.json`)

    await writeFile(predictorPath, JSON.stringify(predictor))
    await writeFile(attributesPath, JSON.stringify(labels))
    await writeFile(pcaPath, pcaModel)

    // TODO: Compute score statistics. Use for visualization.
    // TODO: Define attributes based on highest scores. Set on table.
    // TODO: Analysis of vertical. Use for RAG on item's analysis.
    // TODO: Design & include a performance analysis. New issue. 
}

index()
