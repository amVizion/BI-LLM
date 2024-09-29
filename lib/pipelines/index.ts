import { erlPipeline, iErcConfig } from './1.ERL'
import { spcPipeline, iSpcConfig } from './2.SPC'
import { cdvPipeline, iCdvConfig } from './3.CDV'

import { iInputText, iResearchContext, tVerticalLabels } from '../utils/types'
import MLR from 'ml-regression-multivariate-linear'
import { mkdir, readFile } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'

const LOGS_DIR = 'ignore/logs'
const ERL_DIR = `${LOGS_DIR}/1.ERL`
const SPC_DIR = `${LOGS_DIR}/2.SPC`
const CDV_CONFIG = `${LOGS_DIR}/3.CDV`

const makeDirs = async(config:iConfig) => {
    if(!existsSync(LOGS_DIR)) await mkdir(LOGS_DIR, { recursive: true })
    if(!existsSync(ERL_DIR)) await mkdir(ERL_DIR)
    if(!existsSync(SPC_DIR)) await mkdir(SPC_DIR)
    if(!existsSync(CDV_CONFIG)) await mkdir(CDV_CONFIG)

    if(!config.verticals) return

    const { verticals } = config
    for (const vertical of verticals) {
        const erlDirs = `${ERL_DIR}/${vertical}`
        if(!existsSync(erlDirs)) await mkdir(erlDirs)
        
        const spcDirs = `${SPC_DIR}/${vertical}`
        if(!existsSync(spcDirs)) await mkdir(spcDirs)
    }    
}

export interface iConfig {
    verticals: string[] // Defaults to all. TODO: Validate label prompts.

    data?: iInputText[]
    dataPath?: string 

    verticalLabels?: tVerticalLabels
    labelPrompts?: {[vertical:string]:string}
    pcaModelPath?: string
    skipWrite?: boolean

    labels?: string[]
    nComponents?: number // Defaults to 5. TODO: Parametrize on app config.
    itemsToLabel?: number // Defaults to 100.
    labelPrompt?: string

    itemsToScore?: number
    scorePrompt?: string
    numClusters?: number
    predictor?: MLR // TODO: Implement.

    context?:iResearchContext // TODO: Rename "items" prop to "itemsName".
}

export const getVerticalLabels = (verticals:string[]) => {
    const getLabels = (vertical:string) => {
        const labelsPath = `${ATTRIBUTE_STORE_PATH}/${vertical}/labels.json`
        const labelsBuffer = readFileSync(labelsPath)
        const labels:string[] = JSON.parse(labelsBuffer.toString())
        return labels
    }

    const verticalLabels = verticals.reduce((acc, vertical) => {
        acc[vertical] = getLabels(vertical)
        return acc
    }, {} as {[vertical:string]:string[]})

    return verticalLabels
}


export const ATTRIBUTE_STORE_PATH = '../data/attributeStore'
export const readConfig = async() => {
    const configBuffer = await readFile(`./config.json`)
    const config:iConfig = JSON.parse(configBuffer.toString())

    if(!config.verticals) throw new Error('Verticals not found.')
    if(!config.pcaModelPath) throw new Error('PCA model path not found.')

    const texts = await getTexts(config)
    const verticalLabels = getVerticalLabels(config.verticals)

    // Iterate by verticals, and flat labels.
    const labels = config.verticals.reduce((acc, vertical) => {
        acc.push(...verticalLabels[vertical])
        return acc
    }, [] as string[])

    config.labels = labels
    config.verticalLabels = verticalLabels
    config.skipWrite = true
    
    return { config, texts }
}


const getTexts = async({ dataPath }: iConfig) => {
    // Read data path.

    if(!dataPath) throw new Error('Data path not found.')
    const dataBuffer = await readFile(dataPath)
    const rawData:iInputText[] = JSON.parse(dataBuffer.toString())
    const data = rawData.filter(({ text, output }) => text && output)

    // Validate data object has text and output.
    const hasText = data.every(({ text }) => text)
    const hasOutput = data.every(({ output }) => output)
    if(!hasText || !hasOutput) throw new Error(`Invalid data object: ${hasText}, ${hasOutput}`)

    /* TODO:
    - Support other data formats (CSV).
    - Support mapping from data object to iInputText interface.
    */

    return data
}


const main = async() => {

    // TODO: Read texts from config.
    const {config, texts} = await readConfig()

    const ercConfig:iErcConfig = { ...config, path:ERL_DIR }
    const { embeddedTexts, ...labels } = await erlPipeline(texts, ercConfig)

    const spcConfig:iSpcConfig = { ...config, path:SPC_DIR, ...labels }
    const { clusters, clusteredTexts } = await spcPipeline(embeddedTexts, spcConfig)

    const cdvConfig:iCdvConfig = { ...config, path:CDV_CONFIG, ...labels }
    await cdvPipeline(clusteredTexts, clusters, cdvConfig)
}

// main().catch(console.error)
