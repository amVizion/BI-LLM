import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import { compareEvaluations, evaluatePredictions } from "../reflexion/evaluation"
import { makePredictions } from "../reflexion/predictions"
import { getDistance, retrieve } from "./retrieve"
import { iItem } from "../../app/src/utils/types"
import { improveReport } from "../reflexion"
import path from "path"

const DIR = path.join(__dirname, `ignore/`)
const predict = async() => {
    const randomId = Math.floor(Math.random() * 1000 *1000)

    const randomCenter = Array.from({ length: 5 }, () => (Math.random() * 2) - 1)
    const videos = retrieve({ center: randomCenter })
    const sampleVideos = videos.sort(() => 0.5 - Math.random()).slice(0, 100)
    console.log('videos', sampleVideos.length)

    // Get all centers
    const attributeCenters = readdirSync(DIR).map(d => {
        if(d === 'predictions') return { attribute: d, distance: Infinity }

        const buffer = readFileSync(path.join(DIR, d, 'center.json'))
        const center = JSON.parse(buffer.toString())

        const distance = getDistance(randomCenter, center)
        return { attribute:d, distance }
    })

    const closestAttribute = attributeCenters.sort((a, b) => 
        a.distance - b.distance
    )[0].attribute

    console.log('closestAttribute', closestAttribute)

    const reportPath = path.join(__dirname, `ignore/${closestAttribute}/report.txt`)
    const report = readFileSync(reportPath).toString()

    const predictionsDir = path.join(__dirname, `ignore/predictions/${randomId}`)
    // Make dir recursively
    if(!existsSync(predictionsDir)) mkdirSync(predictionsDir, { recursive: true })

    writeFileSync(`${predictionsDir}/videos.json`, JSON.stringify(sampleVideos))
        
    const predictionsPath = `${predictionsDir}/predictions`
    const predictions = await makePredictions(sampleVideos, report, predictionsPath)
    evaluatePredictions(predictions, `${predictionsDir}/evaluations.json`)
    evaluatePredictions(sampleVideos, `${predictionsDir}/eval-embeddings.json`)

    const chatGptPrompt = `
Your task is to predict the number of views for YouTube videos based on the report below.

## Report
${report}

YouTube videos:
${predictions.map(p => p.text).join('\n')}

Output the predictions in a JSON list with the keys: text, prediction.
`

    const chatGptFileName = `chat-gpt-prompt-${randomId}.txt`
    writeFileSync(`${predictionsDir}/${chatGptFileName}`, chatGptPrompt)

    return

    const reflexion = await reflexionPredictions(videos, report, predictionsDir)

    if(!reflexion) return

    // Else store the new report

    const idPath = path.join(__dirname, `ignore/${randomId}`)
    mkdirSync(idPath, { recursive: true})
    writeFileSync(`${idPath}/center.json`, JSON.stringify(randomCenter))
    writeFileSync(`${idPath}/report.txt`, report)

    return predictions
}

const reflexionPredictions = async(items:iItem[], report:string, dir:string) => {
    const reflexionDir = path.join(`${dir}/reflexion`)
    if(!existsSync(reflexionDir)) mkdirSync(reflexionDir, { recursive: true })

    const reflexion = await improveReport({items, report, dir:reflexionDir})

    const predictions = await makePredictions(items, reflexion, reflexionDir)
    const evaluation = evaluatePredictions(predictions, `${reflexionDir}/evaluations.json`)
    const embeddingevaluations =  evaluatePredictions(items, `${reflexionDir}/eval-embeddings.json`)

    const result = compareEvaluations(evaluation, embeddingevaluations)
    if(result === 'B') return false
    return true
}

const predictLoop = async() => {
    const ITERATIONS = 10

    for (let i = 0; i < ITERATIONS; i++) {
        await predict()
    }
}

predictLoop().catch(console.error)


const multiversePredictions = () => {
    // Get random center

    // Get close videos

    // Make forward-looking predictions

    // Evaluate predictions

    // Compare predictions with traditional evaluations

    // Return results

}
