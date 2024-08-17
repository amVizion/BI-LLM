import { erlPipeline, iErcConfig } from './1. ERL'
import { spcPipeline, iSpcConfig } from './2. SPC'
import { cdvPipeline, iCdvConfig } from './3. CDV'

import { iInputText, iResearchContext } from '../utils/types'
import MLR from 'ml-regression-multivariate-linear'
import { mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'

const LOGS_DIR = 'ignore/logs'
const ERL_DIR = `${LOGS_DIR}/1. ERL`
const SPC_DIR = `${LOGS_DIR}/2. SPC`
const CDV_CONFIG = `${LOGS_DIR}/3.CDV`

const makeDirs = async() => {
    if(!existsSync(LOGS_DIR)) await mkdir(LOGS_DIR, { recursive: true })
    if(!existsSync(ERL_DIR)) await mkdir(ERL_DIR)
    if(!existsSync(SPC_DIR)) await mkdir(SPC_DIR)
    if(!existsSync(CDV_CONFIG)) await mkdir(CDV_CONFIG)
}

interface iConfig {
    dataPath: string 

    labels?: string[]
    nComponents?: number // Defaults to 5. TODO: Parametrize on app config.
    itemsToLabel?: number // Defaults to 100.
    labelPrompt?: string

    itemsToScore?: number
    scorePrompt?: string
    numClusters?: number
    predictor?: MLR // TODO: Implement.

    context:iResearchContext // TODO: Rename "items" prop to "itemsName".
}

const readConfig = async() => {
    const configBuffer = await readFile(`../config.json`)
    const config:iConfig = JSON.parse(configBuffer.toString())

    const { itemName, purpose, outcome } = config.context
    if(!itemName || !purpose || !outcome) throw new Error('Invalid context.')

    return config
}


const getTexts = async({ dataPath }: iConfig) => {
    // Read data path.
    const dataBuffer = await readFile(dataPath)
    const data:iInputText[] = JSON.parse(dataBuffer.toString())

    // Validate data object has text and output.
    const hasText = data.every(({ text }) => text)
    const hasOutput = data.every(({ output }) => output)
    if(!hasText || !hasOutput) throw new Error('Invalid data object.')

    /* TODO:
    - Support other data formats (CSV).
    - Support mapping from data object to iInputText interface.
    */

    return data
}


const main = async() => {
    await makeDirs()

    // TODO: Read texts from config.
    const config = await readConfig()
    const texts:iInputText[] = await getTexts(config)


    const ercConfig:iErcConfig = { ...config, path:ERL_DIR }
    const { embeddedTexts, labels } = await erlPipeline(texts, ercConfig)

    const spcConfig:iSpcConfig = { ...config, path:SPC_DIR, labels }
    const { clusters, clusteredTexts } = await spcPipeline(embeddedTexts, spcConfig)

    const cdvConfig:iCdvConfig = { ...config, path:CDV_CONFIG, labels }
    await cdvPipeline(clusteredTexts, clusters, cdvConfig)
}

main().catch(console.error)
