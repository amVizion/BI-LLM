import { iConfig } from './pipelines/index'
import { iInputText } from './utils/types'

import { embed, reduce } from './pipelines/1.ERL'
import { clusterTexts } from './pipelines/2.SPC'
import { cdvPipeline } from './pipelines/3.CDV'
import { predictScores } from '.'

export const analysis = async(texts:iInputText[]) => {
    const config:iConfig = {
        pcaModelPath: '../data/attributeStore/emotions/pca.json',
        verticals: [ 'emotions', 'topics', 'adjectives' ],    
    }

    // Embed & reduce texts.
    const embeddedTexts = await embed(texts, config)
    const reducedEmbeddings = await reduce(embeddedTexts, config)

    // Numerical analysis.
    const scoredTexts = await predictScores(reducedEmbeddings, config)

    const { clusteredTexts, clusters } = await clusterTexts(scoredTexts, config)
    await cdvPipeline(clusteredTexts, clusters, config)
}

