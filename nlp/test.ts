/*

1. Loop that makes N predictions.
2. Retrieve all the data, select a random title.
3. Prepare prompt based on the report.
4. Make prediction, and store the result.
5. Summarize findings in JSON.

*/


import { writeFileSync } from 'fs'
import data from '../app/src/data/data.json'
import report from '../app/src/data/report.json'
import { callOllama } from '../lib/utils/ollama'

const REPORT = `
${report.title.split('\n')[0]}

${report.intro}

Clusters:
${report.clusters.map(cluster => `${cluster.title}\n${cluster.summary}`).join('\n\n')}

Analysis:
${report.analysis.labels}

${report.analysis.clusters}

Conclusion: ${report.conclusion}
` 


const INSTRUCTIONS_PROMPT = `
Instructions:
Your task is to make a prediction on the number of views for a given YouTube video.
The prediction will be based on a data analysis report that explains the videos performance.  
Your answer will be a number, do not provide explanations.

Data analysis report:
${REPORT}

YouTube video title:`

const index = async() => {
    const n = 10

    interface iResult { text: string, prediction: string, output: number }
    const results:iResult[] = []

    const avgOutput = data.reduce((acc, { output }) => acc + output, 0) / data.length
    for (let i = 0; i < n; i++) {
        const { text, output } = data[Math.floor(Math.random() * data.length)]

        // If text is in results, skip
        if (results.find(result => result.text === text)) continue

        const prompt = `${INSTRUCTIONS_PROMPT}\n${text}\n\nPrediction:\n`
        const prediction = await callOllama(prompt)

        console.log('output', output, avgOutput)
        console.log('prediction', prediction)
        results.push({text, prediction, output})
    }

    writeFileSync('ignore/results.json', JSON.stringify(results, null, 2))
}

index()
