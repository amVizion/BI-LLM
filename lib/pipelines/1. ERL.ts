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

import { iInputText, iEmbeddedText, iResearchContext, tVerticalLabels } from '../utils/types'
import { LABEL_PROMPT } from '../utils/prompts'
import { callOllama } from '../utils/ollama'

import { writeFile, readFile } from 'fs/promises'
import { getSampleTexts } from '../utils/utils'
import { existsSync } from 'fs'
import { PCA } from 'ml-pca'


export interface iErcConfig { // TODO: Refactor. Possibly remove.
    path: string, 

    verticals?: string[], // Defaults to all.
    labelPrompts?: {[vertical:string]:string}

    labels?: string[],
    nComponents?: number, // Defaults to 5. TODO: Parametrize on app config.

    itemsToLabel?: number, // Defaults to 100.
    labelPrompt?: string,

    context: iResearchContext
}

const LABELS_PATH = 'A.4. Labels.json'
const VERTICAL_LABELS_PATH = 'A.5. VerticalLabels.json'

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
    const { path, labelPrompt } = config // Changes based on vertical. TODO: refactor.
    const { context, labels, itemsToLabel=100 } = config

    const writeLabels = async(labels:string[]) => {
        const jsonLabels = JSON.stringify(labels)
        await writeFile(`${path}/4. Labels.json`, jsonLabels)
        return labels
    }

    const LABELS_LENGTH = 3 // TODO: Parametrize (including in prompt, and output validation).

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

    if(labels && labels.length) return writeLabels(labels)

    // Sample texts (length defined on config).
    const sampleTexts = getSampleTexts(texts.map(({ text }) => text), itemsToLabel)

    const allLabels:string[] = []
    const labelsDict = []

    // Call LLM.
    const { purpose, itemName } = context
    const prompt = labelPrompt || LABEL_PROMPT(purpose, itemName)
    for (const text of sampleTexts) {
        const labels = await labelText(`${prompt}\n${text}`)
        if(!labels) continue
        allLabels.push(...labels)
        labelsDict.push({ text, labels })
    }

    // Define labels.
    await writeFile(`${path}/1 AllLabels.json`, JSON.stringify(allLabels))
    await writeFile(`${path}/2 LabelsDict.json`, JSON.stringify(allLabels))
    const uniqueLabels = Array.from(new Set(allLabels))

    // Sort labels by frequency
    const sortedLabels = uniqueLabels.map(label => ({ 
        label, count: allLabels.filter(l => l === label).length
    })).sort(({ count: a }, { count: b }) => a > b ? -1 : 1)
    await writeFile(`${path}/3 SortedLabels.json`, JSON.stringify(sortedLabels))

    // Filter out labels with more than 50% frequency.
    const MAX_COUNT = allLabels.length/(2*LABELS_LENGTH)
    const filteredLabels = sortedLabels.filter(({ count }) => count < MAX_COUNT)

    // Get top 10 or 12 labels. If similar count randomnize.
    const threshold = filteredLabels[10].count
    const topLabels = filteredLabels.filter(({ count }, i) => count >= threshold && i < 12)

    // Store labels.
    return writeLabels(topLabels.map(({ label }) => label))
}


const iterateVerticals = async(texts: iEmbeddedText[], config:iErcConfig) => {
    const { verticals = [], labelPrompts={} } = config
    const verticalLabels:tVerticalLabels = {}

    if(!verticals || !verticals.length) {
        const path = `${config.path}/all`
        const labels = await getLabels(texts, {...config, path})
        return { labels }
    }

    for (const vertical of verticals) {

        const path = `${config.path}/${vertical}`
        const labelPrompt = labelPrompts[vertical]
        const verticalConfig = { ...config, labelPrompt, path }
        const labels = await getLabels(texts, verticalConfig)
        verticalLabels[vertical] = labels
        console.log(`Vertical ${vertical} labels:`, verticalLabels)
    }

    const labels = Object.values(verticalLabels).flat()
    await writeFile(`${config.path}/${LABELS_PATH}`, JSON.stringify(labels))


    const jsonLabels = JSON.stringify(verticalLabels)
    await writeFile(`${config.path}/${VERTICAL_LABELS_PATH}`, jsonLabels)
    return { verticalLabels, labels }
}

// ERL Pipeline
interface iErlOutput { 
    labels:string[] 
    embeddedTexts:iEmbeddedText[]
    verticalLabels?:tVerticalLabels
}

export const erlPipeline = async(texts:iInputText[], config:iErcConfig):Promise<iErlOutput> => {
    // Resume progress
    if(existsSync(`${config.path}/${LABELS_PATH}`)) {
        const embeddedTextsBuffer = await readFile(`${config.path}/A.3. ReducedEmbeddings.json`)
        const embeddedTexts = JSON.parse(embeddedTextsBuffer.toString())

        const labelsBuffer = await readFile(`${config.path}/${LABELS_PATH}`)
        const labels = JSON.parse(labelsBuffer.toString())

        if(!existsSync(`${config.path}/${VERTICAL_LABELS_PATH}`)) return { embeddedTexts, labels }
        const verticalLabelsBuffer = await readFile(`${config.path}/${VERTICAL_LABELS_PATH}`)
        const verticalLabels = JSON.parse(verticalLabelsBuffer.toString())
        return { embeddedTexts, labels, verticalLabels }
    }


    console.log('Starting ERL Pipeline.')
    const embeddedTexts = await embed(texts, config)
    const reducedEmbeddings = await reduce(embeddedTexts, config)
    const labels = await iterateVerticals(reducedEmbeddings, config)

    return { embeddedTexts:reducedEmbeddings, ...labels }
}

