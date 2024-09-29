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

import { iVerticals, iCorrelation, iCluster, iReport, iClusterReport, iReportAnalysis } from '../../app/src/utils/types'
import { getIntro, getClusterAnalysis, writeConclusion, tLabelPrompt, writeAnalysis, getTitle } from '../utils/prompts'
import { iClusteredText, iResearchContext, tVerticalLabels } from '../utils/types'
import { iRawCluster, iColoredCluster } from '../utils/types'

import { PolynomialRegression } from 'ml-regression-polynomial'
import MLR from 'ml-regression-multivariate-linear'
import { writeFile } from 'fs/promises'
import { getVerticalLabels } from '.'


export interface iCdvConfig {
    path?: string
    labels?: string[]
    verticals?: string[]
    context?:iResearchContext
    verticalLabels?: tVerticalLabels
}

export const correlate = async(texts:iClusteredText[], clusters: iRawCluster[], config:iCdvConfig) => {
    const { path } = config

    const computeRho = (x:number[], y:number[]) => {
        try{
            const regressionModel = new PolynomialRegression(x, y, 1)
            const z = x.map(s => regressionModel.predict(s))
            const { r } = regressionModel.score(z, y)
            return r
        } catch(e) {
            return 0 // Scores, and labels do not match.
        }
    }

    const multivariateRegression = (texts:iClusteredText[], vertical:string) => {
        const x = texts.map(({ verticalLabels }) => verticalLabels![vertical].map(({ score }) => score))
        const y = texts.map(({ output }) => [output])

        const regression = new MLR(x, y)
        return regression.stdError
    }

    const getVerticalCorrelations = (texts:iClusteredText[], config:iCdvConfig) => {
        const { verticals, labels } = config

        if(!verticals) return { correlations: getCorrelations(texts, labels)}

        const verticalLabels = getVerticalLabels(verticals)
        if(!verticalLabels) throw new Error('Vertical labels not provided.')


            const correlations = verticals.map(v => getCorrelations(texts, verticalLabels[v], v))
        const allCorrelations = correlations.flat()

        const verticalCorrelations:{[vertical:string]:number} = verticals.reduce((d, v) => ({
            ...d, [v]:multivariateRegression(texts, v)
        }), {})

        const correlationsMap:{[vertical:string]:iCorrelation[]} = verticals.reduce((d, v, i) => ({
            ...d, [v]: correlations[i] 
        }), {})

        return { 
            correlations:allCorrelations, 
            verticalCorrelations:{
                verticals,
                correlations:verticalCorrelations,
                labelCorrelations: correlationsMap
            }
        }
    }

    const getCorrelations = (texts:iClusteredText[], labels?:string[], vertical?:string) => {
        if(!labels) throw new Error('Labels not provided.')

        const correlations:iCorrelation[] = labels.map(label => {
            const x = !vertical 
                ? texts.map(({ labels }) => labels.find(l => l.label === label)!.score) 
                : texts.map(({ verticalLabels }) => verticalLabels![vertical].find(l =>
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

    const getColoredClusters = (texts:iClusteredText[], clusters:iRawCluster[]) => {
        const outputClusters = clusters.map(cluster => {
            const items = texts.filter(({ cluster: c }) => c === cluster.index)

            return {
                ...cluster,
                avgOutput: items.reduce((acc, { output }) => acc + output, 0) / items.length
            }
        })

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

    const getClusterCorrelations = (texts:iClusteredText[], clusters:iColoredCluster[], correlations:iCorrelation[]) => {
        const labels = correlations.map(({ label }) => label)
        const correlatedClusters:iCluster[] = clusters.map(cluster => {
            const items = texts.filter(({ cluster: c }) => c === cluster.index)

            const getAttributes = (labels:string[], items:iClusteredText[]) => labels.map(label => {
                const score = items.map(({ labels }) => labels.find(l => l.label === label)!.score)
                const average = score.reduce((acc, s) => acc + s, 0) / score.length
                const { mean, sd, rho:correlation } = correlations.find(l => label === l.label)!

                const prevalence = (average - mean)/sd
                const causality = prevalence * correlation
                
                const attribute = { label, average, correlation, causality, prevalence }
                return attribute
            })

            const attributes = getAttributes(labels, items)
            const verticalLabels = getVerticalLabels(config.verticals || [])
            const verticalAttributes = config.verticals ? config.verticals.reduce((d, v) => ({
                ...d, [v]: getAttributes(verticalLabels![v], items)
            }), {}): undefined

            return { ...cluster, size:items.length, attributes, verticalAttributes }
        })

        return correlatedClusters
    }

    const coloredClusters = getColoredClusters(texts, clusters)
    const { correlations, verticalCorrelations } = getVerticalCorrelations(texts, config)
    const correlatedClusters = getClusterCorrelations(texts, coloredClusters, correlations)

    const correlationsJson = JSON.stringify(correlations, null, 4)
    const clustersJSON = JSON.stringify(correlatedClusters, null, 4)

    if(path) await writeFile(`${path}/C.1. Correlations.json`, correlationsJson)
    if(path) await writeFile(`${path}/C.2. CorrelatedClusters.json`, clustersJSON)

    if(verticalCorrelations) {
        const verticalCorrelationsJson = JSON.stringify(verticalCorrelations, null, 4)
        if(path) await writeFile(`${path}/C.3. VerticalCorrelations.json`, verticalCorrelationsJson)
    }

    return { clusters:correlatedClusters, correlations, verticalCorrelations }
}


interface iDescribeInput { 
    config:iCdvConfig
    correlations:iCorrelation[]
    verticalCorrelations?: iVerticals
    clusters:iCluster[] 
}
const describe = async(input:iDescribeInput) => {
    const { config, correlations, clusters, verticalCorrelations } = input
    const { context, path } = config

    if(!context) throw new Error('Context not provided.')

    // Get introduction
    const clustersReport:iClusterReport[] = []

    // Describe clusters
    for (const { attributes, verticalAttributes, index } of clusters) {
        const { verticals } = config
        const verticalLabels = getVerticalLabels(verticals || [])

        const labels:tLabelPrompt = verticals && verticalLabels
            ? verticals.map(v => 
                verticalAttributes![v].sort(({ prevalence: a }, { prevalence: b }) => (a || -1) > (b || -1) ? -1 : 1)
                .filter(({ prevalence }, i) => i < 3 && (prevalence || -1) > 0).map(({ label }) => label)
            ).reduce((d, v, i) => ({ ...d, [verticals[i]]:v }), {})
            : attributes.sort(({ prevalence: a }, { prevalence: b }) => (a || -1) > (b || -1) ? -1 : 1)
            .filter(({ prevalence }, i) => i < 3 && (prevalence || -1) > 0).map(({ label }) => label)

        const positive:tLabelPrompt = verticals && verticalLabels
            ? verticals.map(v =>
                verticalAttributes![v].sort(({ correlation: a }, { correlation: b }) => a > b ? -1 : 1)
                .filter(({ correlation }, i) => correlation > 0 && i < 3).map(({ label }) => label)
            ).reduce((d, v, i) => ({ ...d, [verticals[i]]:v }), {})
            : attributes.sort(({ correlation:a }, { correlation:b }) => a > b ? -1 : 1)
            .filter(({ correlation }, i) => correlation > 0 && i < 3).map(({ label }) => label)

        const negative:tLabelPrompt = verticals && verticalLabels
            ? verticals.map(v =>
                verticalAttributes![v].sort(({ correlation: a }, { correlation: b }) => a > b ? 1 : -1)
                .filter(({ correlation }, i) => correlation < 0 && i < 2).map(({ label }) => label)
            ).reduce((d, v, i) => ({ ...d, [verticals[i]]:v }), {})    
            : attributes.sort(({ correlation:a }, { correlation:b }) => a > b ? 1 : -1)
            .filter(({ correlation }, i) => correlation < 0 && i < 2).map(({ label }) => label)

        const clusterAnalysis = await getClusterAnalysis({ index, verticals, context, labels, positive, negative })
        clustersReport.push(clusterAnalysis)

    } // TODO: Test prompts, and computation of correlation objects.


    const namedClusters = clusters.map((cluster, i) => ({ 
        ...cluster, 
        name: clustersReport[i].name,
        summary: clustersReport[i].summary,
        description: `${clustersReport[i].description}\n\n${clustersReport[i].analysis}`
    }))


    const positive = config.verticals && verticalCorrelations?.labelCorrelations
        ? config.verticals.map(v => 
            verticalCorrelations.labelCorrelations[v]
            .filter(({ rho }) => rho > 0).sort(({ rho: a }, { rho: b }) => a > b ? -1 : 1)
            .map(({ label }) => label)).reduce((d, v, i) => ({ ...d, [config.verticals![i]]:v }), {})
        : correlations.filter(({ rho }) => rho > 0)
            .sort(({ rho: a }, { rho: b }) => a > b ? -1 : 1).map(({ label }) => label)

    const negative = config.verticals && verticalCorrelations?.labelCorrelations
        ? config.verticals.map(v =>
            verticalCorrelations.labelCorrelations[v]
            .filter(({ rho }) => rho < 0).sort(({ rho: a }, { rho: b }) => a > b ? 1 : -1)
            .map(({ label }) => label)).reduce((d, v, i) => ({ ...d, [config.verticals![i]]:v }), {})
        : correlations.filter(({ rho }) => rho < 0)
            .sort(({ rho: a }, { rho: b }) => a > b ? 1 : -1).map(({ label }) => label)

    const { purpose } = context
    // Add name to clusters

    const analysis:iReportAnalysis = await writeAnalysis({
        purpose, verticals:config.verticals || [], positive, negative, clusters:namedClusters
    })

    const body = `
${clustersReport.map(({ description }) => `${description}\n\n`).join('\n\n')}
${analysis.labels}\n\n${analysis.clusters}
`

    const conclusion = await writeConclusion(body)
    const intro = await getIntro(body, purpose)
    const title = await getTitle(`${intro}\n\n${body}\n\n${conclusion}`)

    const report:iReport = { title, intro, clusters:clustersReport, analysis, conclusion }
    if(path) await writeFile(`${path}/C.4. Report.json`, JSON.stringify(report, null, 4))


    return { report, clusters:namedClusters }
}

interface iVisualizeInput { 
    texts:iClusteredText[] 
    correlations:iCorrelation[]
    verticalCorrelations?: iVerticals
    clusters?:iCluster[]
    report?:iReport
}

const visualize = async(input:iVisualizeInput) => {
    const APP_DIR = '../app/src/data'
    const { correlations, clusters, texts, report, verticalCorrelations={} } = input

    await writeFile(`${APP_DIR}/data.json`, JSON.stringify(texts, null, 4))
    await writeFile(`${APP_DIR}/correlations.json`, JSON.stringify(correlations, null, 4))
    await writeFile(`${APP_DIR}/verticals.json`, JSON.stringify(verticalCorrelations, null, 4))    

    if(!clusters || ! report) return

    await writeFile(`${APP_DIR}/report.json`, JSON.stringify(report, null, 4))
    await writeFile(`${APP_DIR}/clusters.json`, JSON.stringify(clusters, null, 4))

    return
}

export const cdvPipeline = async(texts:iClusteredText[], rawClusters:iRawCluster[], config:iCdvConfig) => {
    console.log('Starting CDV Pipeline.')
    const correlated = await correlate(texts, rawClusters, config)
    if(!config.context) return await visualize({...correlated, texts, })
    
    const { report, clusters } = await describe({ ...correlated, config })
    return await visualize({ ...correlated, texts, report, clusters })
}
