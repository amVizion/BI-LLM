import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { getQuartiles } from '../../app/src/utils/prompts'
import { iItem } from '../../app/src/utils/types'

import { compareReports, evaluatePredictions } from './evaluation'
import { makePredictions, cotPrediction } from './predictions'
import { iInputText } from '../utils/types'
import { reflexion } from './reflexion'
import { analysis } from '../analysis'
import { getReport } from './report'


const DIR = 'reflexion/ignore'

const getTexts = () => {
    const buffer = readFileSync('../solutions/ignore/data/youtube/20VC/videos.json')
    const videos = JSON.parse(buffer.toString())

    const texts:iInputText[] = videos.map(({ snippet, statistics }:any) => ({
        text: snippet?.title!,
        output: Number(statistics?.viewCount!),
    })).filter(({ output }:{ output:number }) => output)

    return texts
}

const v1 = async() => {
    const texts = getTexts()

    const { texts:items, correlations, verticalCorrelations } = await analysis(texts, DIR)
    const report = await getReport({ items, correlations, verticalCorrelations, dir:DIR })

    const quartiles =  getQuartiles(items.map(({ output }) => output))
    const predictions = await makePredictions(items, report, quartiles, DIR)

    const evaluation = evaluatePredictions(predictions, quartiles, `${DIR}/evaluations.json`)
    console.log(evaluation)
}

interface iImproveReportInput { items:iItem[], report:string, dir:string }
const improveReport = async({ items, report, dir }:iImproveReportInput) => {
    let NUMBER_OF_PREDICTIONS = 20
    const predictions:iItem[] = []
    const quartiles =  getQuartiles(items.map(({ output }) => output))

    while (NUMBER_OF_PREDICTIONS--) {
        const item = items[Math.floor(Math.random() * items.length)]
        const predictionInput = { item, report, quartiles, dir }
        try {
            const prediction = await cotPrediction(predictionInput)
            predictions.push(prediction)
        } catch (error) {}
    }

    const plainPredictions = predictions.map(i => ({ 
        text:i.text, output:i.output, prediction:i.prediction, analysis:i.analysis 
    }))
    const jsonPredictions = JSON.stringify(plainPredictions, null, 2)
    writeFileSync(`${dir}/predictions.json`, jsonPredictions)

    const newReport = await reflexion(predictions, report, dir)
    return newReport
}

const index = async() => {
    // If summary file exists, skip.
    try {
        const data = readFileSync(`${DIR}/data.json`)
        const items:iItem[] = JSON.parse(data.toString())

        const summary = readFileSync(`${DIR}/summary.txt`)
        let report:string = summary.toString()

        const ITERATIONS = 10
        for (let i = 0; i < ITERATIONS; i++) {
            const dir = `${DIR}/iteration-${i}`
            // Make dir
            if(!existsSync(dir)) mkdirSync(dir) 

            const reflexion = await improveReport({ items, report, dir })
            report = await compareReports(items, report, reflexion, dir)
            writeFileSync(`${DIR}/report.txt`, report)
            writeFileSync(`${dir}/report.txt`, report)
        }
    } catch (error) { v1() }
}

index().catch(console.error)
