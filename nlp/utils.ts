import { readFile, mkdir } from 'fs/promises'
import { getSampleTexts } from '../lib/utils/utils'
import { existsSync } from 'fs'

export const readConfig = async() => {
    const configJSON = await readFile('config.json')
    const config = JSON.parse(configJSON.toString())
    return config
}

export const sampleTexts = async(dataPath:string, n?:number) => {
    const textsBuffer = await readFile(dataPath)
    const textsJSON = JSON.parse(textsBuffer.toString())
    const texts:string[] = textsJSON.map(({text}:{text:string}) => text)

    const sample = getSampleTexts(texts, n || 100)
    return {texts, sample}
}

export const getTrainingPath = async(verticalName:string) => {
    const path = `./data/${verticalName}`

    const labelsPath = `${path}/labels`
    const labelsDirExists = existsSync(labelsPath)
    if(!labelsDirExists) await mkdir(labelsPath, {recursive:true})

    const scoresPath = `${path}/scores`
    const scoresDirExists = existsSync(scoresPath)
    if(!scoresDirExists) await mkdir(scoresPath)

    const embeddingsPath = `${path}/embeddings`
    const embeddingsDirExists = existsSync(embeddingsPath)
    if(!embeddingsDirExists) await mkdir(embeddingsPath)

    const predictDir = `${path}/predictions`
    const predictDirExists = existsSync(predictDir)
    if(!predictDirExists) await mkdir(predictDir)

    return { labelsPath, scoresPath, embeddingsPath, predictDir }
} // TODO: Rename paths to dirs.
