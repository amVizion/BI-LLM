import { getQuartile } from '../../app/src/utils/prompts'
import { evaluatePredictions } from './evaluation'
import { makePredictions } from './predictions'
import { analysis } from '../analysis'
import { getReport } from './report'
import { readFileSync, write, writeFileSync } from 'fs'
import { iInputText } from '../utils/types'


const index = async() => {
    const buffer = readFileSync('../solutions/ignore/data/youtube/20VC/shorts.json')
    const videos = JSON.parse(buffer.toString())

    const texts:iInputText[] = videos.map(({ snippet, statistics }:any) => ({
        text: snippet?.title!,
        output: Number(statistics?.viewCount!),
    })).filter(({ output }:{ output:number }) => output)
    
    const dir = 'reflexion/ignore'

    const { texts:items, correlations, verticalCorrelations } = await analysis(texts, dir)
    const report = await getReport({ items, correlations, verticalCorrelations, dir })

    const { q1, q2:median, q3 } =  getQuartile(items.map(({ output }) => output))
    const quartiles = { q1, median, q3 }

    const predictions = await makePredictions(items, report, quartiles)
    writeFileSync(`${dir}/predictions.json`, JSON.stringify(predictions, null, 2))

    const evaluation = evaluatePredictions(predictions, quartiles)
    writeFileSync(`${dir}/evaluations.json`, JSON.stringify(evaluation, null, 2))

    console.log(evaluation)
}

index().catch(console.error)
