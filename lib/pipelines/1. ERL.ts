/*
Embed-reduce-label pipeline (ERL):

Input:
- Array of strings.
- Logs path.

1. Embeddings
    1.1. Initialize TensorflowJS model.
    1.2. Embeds texts.
    1.3. Map embeddings to texts. 
    1.4. Store embeddings.
    TODO: Iterate if array length is too long.

2. Reduce
    2.1. Train or load PCA model.
    2.2. Map & store reduced embeddings.

3. Label
    3.1. If labels are provided, pass.
    3.2. Else, sample texts and call LLM.
    3.3. Algorithm to define labels.
        3.3.1. Read params from config.
    3.4. Store labels.
    3.5. Provide opportunity to stop, review & edit.

Stored outputs:
    - Embeddings.
    - Reduced embeddings.
    - PCA Model.
    - All Labels.
    - Labels.

Output:
    - Texts array:
        - Original texts.
        - Reduced embeddings.
    - Labels array (string).
*/


import * as use from '@tensorflow-models/universal-sentence-encoder'
import '@tensorflow/tfjs-node'

import { iInputText, iEmbeddedText, iResearchContext } from '../utils/types'
import { LABEL_PROMPT } from '../utils/prompts'
import { callOllama } from '../utils/ollama'

import { writeFile, readFile } from 'fs/promises'
import { getSampleTexts } from '../utils/utils'
import { existsSync } from 'fs'
import { PCA } from 'ml-pca'


export interface iErcConfig { 
    path: string, 
    labels?: string[],
    nComponents?: number, // Defaults to 5. TODO: Parametrize on app config.

    itemsToLabel?: number, // Defaults to 100.
    labelPrompt?: string,

    context: iResearchContext
}


// Embed
const embed = async(texts:iInputText[], {path}:iErcConfig) => {
    const model = await use.load()

    const tensors = await model.embed(texts.map(({ text }) => text))
    const embeddings = tensors.arraySync()

    const embeddedTexts:iEmbeddedText[] = texts.map((t, i) => ({...t, embeddings:embeddings[i]})) 

    const jsonEmbeddings = JSON.stringify(embeddedTexts)
    await writeFile(`${path}/A.1. Embeddings.json`, jsonEmbeddings)
    console.log('Embeddings completed.')
    return embeddedTexts

    // TODO: Add batchsize config for large array sizes (5K+).
}

// Reduce
const reduce = async(texts:iEmbeddedText[], config:iErcConfig) => {
    const { path, nComponents=5 } = config

    const embeddings = texts.map(({ embeddings }) => embeddings)
    const pca = new PCA(embeddings)
    const pcaEmbeddings = pca.predict(embeddings, { nComponents }).to2DArray()

    // Store model for reproducibility.
    await writeFile(`${path}/A.2. PCA.json`, JSON.stringify(pca))

    const reducedEmbeddings:iEmbeddedText[] = texts.map((t, i) => ({...t, embeddings:pcaEmbeddings[i]}))

    const jsonReducedEmbeddings = JSON.stringify(reducedEmbeddings)
    await writeFile(`${path}/A.3. ReducedEmbeddings.json`, jsonReducedEmbeddings)
    return reducedEmbeddings
}


const getLabels = async(texts: iEmbeddedText[], config:iErcConfig) => {
    const { path, context } = config

    const writeLabels = async(labels:string[]) => {
        const jsonLabels = JSON.stringify(labels)
        await writeFile(`${path}/A.5. Labels.json`, jsonLabels) // TODO: Avoid duplication.
        return labels
    }

    const LABELS_LENGTH = 3 // TODO: Parametrize (including prompt).

    const labelText = async(prompt:string) => {
        try{
            const labels = await callOllama(prompt)
            const jsonLabels = JSON.parse(labels)

            if(!Array.isArray(jsonLabels)) throw new Error('Not an array.')
            if(jsonLabels.length !== LABELS_LENGTH) throw new Error('Length mismatch.')

            // Test if every element is a single word:
            const isSingleWord = jsonLabels.every((l:string) => l.split(' ').length === 1)
            if(!isSingleWord) throw new Error('Not single word.')

            return jsonLabels
        } catch(e) {}
    }

    if(config.labels && config.labels.length) return writeLabels(config.labels)

    // Sample texts (read from config).
    const itemsToLabel = config.itemsToLabel || 100
    const sampleTexts = getSampleTexts(texts.map(({ text }) => text), itemsToLabel)

    const allLabels:string[] = []

    // Call LLM.
    const { purpose, itemName } = context
    const prompt = config.labelPrompt || LABEL_PROMPT(purpose, itemName)
    for (const text of sampleTexts) {
        const labels = await labelText(`${prompt}\n${text}`)
        if(!labels) continue
        allLabels.push(...labels)
    }

    // Define labels.
    await writeFile(`${path}/A.4 AllLabels.json`, JSON.stringify(allLabels))
    const uniqueLabels = Array.from(new Set(allLabels))

    // Sort labels by frequency
    const sortedLabels = uniqueLabels.map(label => ({ 
        label, count: allLabels.filter(l => l === label).length
    })).sort(({ count: a }, { count: b }) => a > b ? -1 : 1)

    // Filter out labels with more than 50% frequency.
    const MAX_COUNT = allLabels.length/(2*LABELS_LENGTH)
    const filteredLabels = sortedLabels.filter(({ count }) => count < MAX_COUNT)

    // Get top 10 or 12 labels. If similar count randomnize.
    const threshold = filteredLabels[10].count
    const topLabels = filteredLabels.filter(({ count }, i) => count >= threshold && i < 12)

    // Store labels.
    return writeLabels(topLabels.map(({ label }) => label))
}

// ERL Pipeline
interface iErlOutput { embeddedTexts:iEmbeddedText[], labels:string[] }
export const erlPipeline = async(texts:iInputText[], config:iErcConfig):Promise<iErlOutput> => {
    // Resume progress
    if(existsSync(`${config.path}/A.5. Labels.json`)) {
        const embeddedTextsBuffer = await readFile(`${config.path}/A.3. ReducedEmbeddings.json`)
        const embeddedTexts = JSON.parse(embeddedTextsBuffer.toString())

        const labelsBuffer = await readFile(`${config.path}/A.5. Labels.json`)
        const labels = JSON.parse(labelsBuffer.toString())
        return { embeddedTexts, labels }
    }


    console.log('Starting ERL pipeline.')
    const embeddedTexts = await embed(texts, config)
    const reducedEmbeddings = await reduce(embeddedTexts, config)
    const labels = await getLabels(reducedEmbeddings, config)

    return { embeddedTexts:reducedEmbeddings, labels }
}

