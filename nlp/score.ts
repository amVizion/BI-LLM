import { iInputText, iScoredText, tScore } from '../lib/utils/types'
import { getTrainingPath, readConfig, sampleTexts } from './utils'
import { readFile, writeFile, mkdir} from 'fs/promises'
import { embed, reduce } from '../lib/pipelines/1.ERL'
import { getScores } from '../lib/pipelines/2.SPC'
import { getSampleTexts } from '../lib/utils/utils'

const index = async() => {
    const { dataPath, verticalName, itemsToScore=100, ...config } = await readConfig()
    const { scoresPath, labelsPath, embeddingsPath } = await getTrainingPath(verticalName)
    const { texts } = await sampleTexts(dataPath)
    
    // 1. Embed texts.
    const inputTexts:iInputText[] = texts.map(text => ({ text, output:0 }))
    const embeddings = await embed(inputTexts, { path:embeddingsPath })

    // 2. Load, or train (and store) PCA model.
    const reducedEmbeddings = await reduce(embeddings, { ...config, path:embeddingsPath })

    // 3. Sample & label texts (read prompt from config).
    const labelsBuffer = await readFile(`${labelsPath}/Labels.json`)
    const attributes:string[] = JSON.parse(labelsBuffer.toString())

    // Sort attributes randomly.
    attributes.sort(() => Math.random() - 0.5)

    // Split labels in groups of 10.
    const labelsGroups = attributes.reduce((acc, label, i) => {
        const groupIndex = Math.floor(i / 10)
        acc[groupIndex] = acc[groupIndex] || []
        acc[groupIndex].push(label)
        return acc
    }, [] as string[][])

    const sample = getSampleTexts(reducedEmbeddings.map(({ text }) => text), itemsToScore)
    const textsToScore = sample.map(t => reducedEmbeddings.find(({ text }) => text === t)!)

    const allScores:iScoredText[][] = []
    for (const idx in labelsGroups) {
        const path = `${scoresPath}/${idx}` // TODO: Extend for retraining.
        await mkdir(path)

        const labels = labelsGroups[idx]
        const context = { itemName:config.itemName }
        const scoresConfig = {...config, path, labels, context }

        const scores = await getScores(textsToScore, scoresConfig)
        allScores.push(scores)
    }

    // Reduce texts to a single array. Merge scores in single map.
    const scoredTexts:iScoredText[] = textsToScore.map(t => {
        // Merge scores if text is the same.
        const textScores = allScores.reduce((d, scores) => {
            const sameText = scores.find(({ text }) => t.text === text)
            if(sameText) return [...d, ...sameText.scores]
            return d
        }, [] as tScore[])

        return { ...t, scores:textScores }
    })

    const scoredJSON = JSON.stringify(scoredTexts, null, 2)
    await writeFile(`${scoresPath}/Scores.json`, scoredJSON)
}


index().catch(console.error)
