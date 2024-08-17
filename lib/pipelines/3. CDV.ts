/*

Correlate Describe Visualize (CDV) Pipeline:

1. Correlate:
    1.1. Predict likelihood of outcome based on embeddings.
    1.2. Individually correlate success for labels, and clusters.
    1.3. Associate likelihood for clusters (color clusters).
    1.4. Store correlations & texts with predictions.

2. Describe:
    2.1. Write introduction based on analysis purpose, and labels.
    2.2. Describe clusters individually.
        2.1. Description of cluster labels.
        2.2. Correlate clusters with success.
        2.3. Consolidate cluster descriptions.
    2.3. Write conclusion.
        2.3.1. Summarize clusters.
        2.3.2. Describe labels correlated with success.
        2.3.3. Consolidate conclusion.
    2.4. Edit & write analysis.

3. Visualize:
    3.1. Write artifacts (copy to app):
        - Chart: reduced clusters & texts.
        - Correlations table: correlation by label & cluster composition.
        - Predictions table for every text.
        - Cluster descriptions.
    3.2. Full report.
    3.3. Initialize app.

*/

import { iClusteredText, iCorrelation, iResearch, iResearchContext } from '../utils/types'
import { getIntro, getClusterAnalysis, writeConclusion } from '../utils/prompts'
import { iCluster, iColoredCluster, iCorrelatedCluster } from '../utils/types'

import { PolynomialRegression } from 'ml-regression-polynomial'
import { writeFile } from 'fs/promises'


export interface iCdvConfig {
    labels: string[]
    path: string
    context:iResearchContext
}

const correlate = async(texts:iClusteredText[], clusters: iCluster[], config:iCdvConfig) => {
    const { path, labels } = config

    const computeRho = (x:number[], y:number[]) => {
        const regressionModel = new PolynomialRegression(x, y, 1)
        const z = x.map(s => regressionModel.predict(s))
        const { r } = regressionModel.score(z, y)
        return r
    }

    const getCorrelations = (texts:iClusteredText[], labels:string[]) => {
        const correlations:iCorrelation[] = labels.map(label => {
            const x = texts.map(({ labels }) => labels.find(l => 
                l.label === label)!.score
            )

            const y = texts.map(({ output }) => output)
            const rho = computeRho(x, y)

            const mean = x.reduce((acc, s) => acc + s, 0) / x.length
            const sd = Math.sqrt(x.reduce((acc, s) => acc + (s - mean) ** 2, 0) / x.length)

            return { label, rho, mean, sd }
        })

        return correlations
    }

    const getColoredClusters = (clusters:iCluster[]) => {
        const outputClusters = clusters.map(cluster => ({
            ...cluster,
            avgOutput: cluster.items.reduce((acc, { output }) => acc + output, 0) / cluster.items.length
        }))

        const maxOutput = Math.max(...outputClusters.map(({ avgOutput }) => avgOutput))
        const minOutput = Math.min(...outputClusters.map(({ avgOutput }) => avgOutput))

        const coloredClusters = outputClusters.map(cluster => {
            const { avgOutput } = cluster
            const green = 255 * (avgOutput - minOutput) / (maxOutput - minOutput)
            const red = 255 - green
            const color = `rgb(${red}, ${green}, 0)`
            return { ...cluster, color }
        }) 

        return coloredClusters
    }

    const getClusterCorrelations = (clusters:iColoredCluster[], correlations:iCorrelation[]) => {
        const labels = correlations.map(({ label }) => label)
        const correlatedClusters:iCorrelatedCluster[] = clusters.map(cluster => {
            const attributes = labels.map(label => {
                const score = cluster.items.map(({ labels }) => labels.find(l => l.label === label)!.score)
                const average = score.reduce((acc, s) => acc + s, 0) / score.length
                const { mean, sd, rho:correlation } = correlations.find(l => label === l.label)!

                const causality = average * correlation
                const prevalence = (average - mean)/sd
                
                const attribute = { label, average, correlation, causality, prevalence }
                return attribute
            })

            return { ...cluster, attributes }
        })

        return correlatedClusters
    }

    const coloredClusters = getColoredClusters(clusters)
    const correlations = getCorrelations(texts, labels)
    const correlatedClusters = getClusterCorrelations(coloredClusters, correlations)

    const correlationsJson = JSON.stringify(correlations, null, 4)
    const clustersJSON = JSON.stringify(correlatedClusters, null, 4)

    await writeFile(`${path}/C.1. Correlations.json`, correlationsJson)
    await writeFile(`${path}/C.2. CorrelatedClusters.json`, clustersJSON)

    return { clusters:correlatedClusters, correlations }
}


interface iDescribeInput { config:iCdvConfig, correlations:iCorrelation[], clusters:iCorrelatedCluster[] }
const describe = async(input:iDescribeInput) => {
    const { config, correlations, clusters } = input
    const { context } = config

    const labels = correlations.map(({ label }) => label)

    // Get introduction
    const { purpose, itemName } = context
    const intro = await getIntro({ purpose, labels })
    const body = []

    // Describe clusters
    for (const { attributes } of clusters) {
        const labels = attributes.sort(({ prevalence: a }, { prevalence: b }) => a > b ? -1 : 1).map(({ label }) => label)
        const positive = attributes.sort(({ correlation:a }, { correlation:b }) => a > b ? -1 : 1).map(({ label }) => label)
        const negative = attributes.sort(({ correlation:a }, { correlation:b }) => a > b ? 1 : -1).map(({ label }) => label)

        const clusterAnalysis = await getClusterAnalysis({ ...context, labels, positive, negative })
        body.push(clusterAnalysis)
    } // TODO: Test prompts, and computation of correlation objects.

    const positive = correlations.sort(({ rho: a }, { rho: b }) => a > b ? -1 : 1).map(({ label }) => label)
    const negative = correlations.sort(({ rho: a }, { rho: b }) => a > b ? 1 : -1).map(({ label }) => label)

    // Write conclusion
    const conclusion = await writeConclusion({...context, positive, negative})

    const research:iResearch = { intro, body, conclusion }
    await writeFile(`${config.path}/C.3. Research.json`, JSON.stringify(research, null, 4))
    return research
}

interface iReport { intro:string, body:string[], conclusion:string }
interface iVisualizeInput { 
    correlations:iCorrelation[]
    clusters:iCorrelatedCluster[]
    texts:iClusteredText[] 
    report:iReport
}

const visualize = async(input:iVisualizeInput) => {
    const APP_DIR = '../../app/src/data'
    const { correlations, clusters, texts, report } = input

    await writeFile(`${APP_DIR}/correlations.json`, JSON.stringify(correlations, null, 4))
    await writeFile(`${APP_DIR}/clusters.json`, JSON.stringify(clusters, null, 4))
    await writeFile(`${APP_DIR}/data.json`, JSON.stringify(texts, null, 4))
    await writeFile(`${APP_DIR}/report.json`, JSON.stringify(report, null, 4))
    
    return
}


export const cdvPipeline = async(texts:iClusteredText[], clusters:iCluster[], config:iCdvConfig) => {
    const correlated = await correlate(texts, clusters, config)
    const report = await describe({ ...correlated, config })
    await visualize({...correlated, texts, report })
}

