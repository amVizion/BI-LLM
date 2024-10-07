import { iConfig } from './pipelines/index'
import { iEmbeddedText, iInputText } from './utils/types'

import { embed, reduce } from './pipelines/1.ERL'
import { clusterTexts } from './pipelines/2.SPC'
import { cdvPipeline } from './pipelines/3.CDV'
import { predictScores } from '.'

export const analysis = async(texts:iInputText[], outputPath:string) => {
    const config:iConfig = {
        pcaModelPath: '../data/attributeStore/emotions/pca.json',
        verticals: [ 'emotions', 'topics', 'adjectives' ],
        outputPath  
    }

    // Embed & reduce texts.
    const embeddedTexts = await embed(texts, config)
    const reducedEmbeddings = await reduce(embeddedTexts, config)

    // Numerical analysis.
    const scoredTexts = await predictScores(reducedEmbeddings, config)

    const { clusteredTexts, clusters } = await clusterTexts(scoredTexts, config)
    await cdvPipeline(clusteredTexts, clusters, config)
}

export const embeddedAnalysis = async(embeddedTexts:iEmbeddedText[], outputPath:string) => {
    const config:iConfig = {
        pcaModelPath: '../data/attributeStore/emotions/pca.json',
        verticals: [ 'emotions', 'topics', 'adjectives' ],
        outputPath
    }

    // Numerical analysis.
    const scoredTexts = await predictScores(embeddedTexts, config)

    const { clusteredTexts, clusters } = await clusterTexts(scoredTexts, config)
    await cdvPipeline(clusteredTexts, clusters, config)   
}
