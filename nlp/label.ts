/*

# Labeling:
1. [ ] Embed texts.
    - [ ] Store PCA model.
    - [ ] Reuse PCA model.
    - [ ] Store texts (with embeddings).
2. [ ] Label texts.
    - [ ] Store selected labels.
    - [ ] Store labeled texts.

TODO:
- Fix Docs (no embeddings on this module).
- Allow for extending labeled data (read file if vertical matches). Support versioning.
- Allow description for complex labels.
- Skip instructions config.

*/

import { getTrainingPath, readConfig, sampleTexts } from './utils'
import { callOllama } from '../lib/utils/ollama'
import { writeFile } from 'fs/promises'

// New function, that differs by providing a description of the label. 
const label = async(input:{texts:string[], labelPrompt:string, path:string}) => {
    const {texts, labelPrompt, path} = input

    const LABEL_PROMPT = `
Output a JSON array. No comments, or explanations required.
Example: ["adjective1", "adjective2", "adjective3"]

${labelPrompt}`        

    // Call Ollama
    const allLabels:string[] = []
    const textLabels = []

    // Iterate by text. Then call Ollama
    for (const i in texts) {
        console.log(i)
        const prompt = `${LABEL_PROMPT}\n${texts[i]}` 
        const labelsJSON = await callOllama(prompt);

        try {
            const labels:string[] = JSON.parse(labelsJSON)
            // Validate that labels is an array:
            if(!Array.isArray(labels)) throw new Error('Labels must be an array.')

            // Validate that each label is one-word or two-words max.
            for(const label of labels) {
                const LABEL_ERROR = 'Labels must be one-word or two-words max.'
                if(label.split(' ').length > 2) throw new Error(LABEL_ERROR)
            }

            allLabels.push(...labels)
            textLabels.push({text:texts[i], labels})
        } catch(e) { console.log(e)}
    }

    // Store Labels
    await writeFile(`${path}/A.1. RawLabels.json`, JSON.stringify(allLabels))
    await writeFile(`${path}/A.2. TextLabels.json`, JSON.stringify(textLabels))

    // Count unique labels
    const uniqueLabels = allLabels.reduce((d, label) => {
        const l = label.toLowerCase()
        return d[l] ? { ...d, [l]: d[l] + 1 } : { ...d, [l]: 1 }
    }, {} as {[label:string]:number})

    const sortedLabels = Object.entries(uniqueLabels).sort((a, b) => b[1] - a[1])
    const sortedLabelsJSON = JSON.stringify(sortedLabels, null, 2)
    await writeFile(`${path}/A.3. SortedLabels.json`, sortedLabelsJSON)
}

const index = async() => {
    // Read config.
    const config = await readConfig()
    const { dataPath, labelPrompt, verticalName, itemsToLabel } = config

    // Label texts.
    const { sample } = await sampleTexts(dataPath, itemsToLabel)
    const { labelsPath } = await getTrainingPath(verticalName)
    await label({texts:sample, labelPrompt, path:labelsPath})
}

index()
