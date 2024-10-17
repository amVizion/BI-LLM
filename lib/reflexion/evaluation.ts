/*

## Evaluation metrics

### Accuracy
- Mean Logarithmic Error (MLE): the average of the logarithmic differences between the predicted and actual values.
- Correlation: the degree of linear relationship between the predicted and actual values.
- Ranking: average difference between the ranking of the predicted and actual values.

### Neutrality
- Median balance: number of prediction values above the median, and below the median.
- Quartile balance: number of prediction values in the first, and fourth quartiles.

### Anomaly detection
- Quartile detection: number of prediction values in the first, and fourth quartiles.
- Max/min distance: distance between the maximum and minimum values, and the predictions.
- Top/bottom 5 mean views: average number of views for the top and bottom 5 predictions.

### Consistency
- Mean difference: average difference between the first, and second prediction.
- Top 10 proportion: percentage of loss in videos with top 10 difference. 

*/

import { iItem } from "../../app/src/utils/types"
import { makePredictions } from "./predictions"
import { getQuartiles } from "../../app/src/utils/prompts"
import { writeFileSync } from "fs"

const getAccuracyMetrics = (predictions:iItem[]) => {
    const MLE = predictions.reduce((acc, { output, prediction }) => {
        const diff = Math.log(Math.abs(output - prediction) + 1)
        return acc + diff
    }, 0) / predictions.length

    const getCorrelation = (predictions:iItem[]) => {
        const x = predictions.map(({ prediction }) => prediction)
        const y = predictions.map(({ output }) => output)

        const meanX = x.reduce((acc, val) => acc + val, 0) / x.length
        const meanY = y.reduce((acc, val) => acc + val, 0) / y.length

        const numerator = x.reduce((acc, val, idx) => acc + (val - meanX) * (y[idx] - meanY), 0)
        const denominatorX = Math.sqrt(x.reduce((acc, val) => acc + Math.pow(val - meanX, 2), 0))
        const denominatorY = Math.sqrt(y.reduce((acc, val) => acc + Math.pow(val - meanY, 2), 0))

        const correlation = numerator / (denominatorX * denominatorY)
        return correlation
    }

    const correlation = getCorrelation(predictions)

    const getRanking = (predictions:iItem[]) => {
        const sortedPredictions = predictions.slice().sort((a, b) => a.prediction - b.prediction)
        const sortedOutputs = predictions.slice().sort((a, b) => a.output - b.output)

        const rankingDiffs = sortedPredictions.map((pred, idx) => {
            const outputIdx = sortedOutputs.findIndex(output => output.output === pred.output)
            return Math.abs(idx - outputIdx)
        })

        const ranking = rankingDiffs.reduce((acc, diff) => acc + diff, 0) / predictions.length
        return ranking
    }

    const ranking = getRanking(predictions)
    return { MLE, correlation, ranking }
}

export interface iQuartiles { q1:number, median:number, q3:number, max:number, min:number }
const getNeutralityMetrics = (predictions:iItem[], quartiles:iQuartiles) => {
    const getMedianBalance = (predictions:iItem[], median:number) => {
        const aboveMedian = predictions.filter(({ prediction }) => prediction > median).length
        const outputsAboveMedian = predictions.filter(({ output }) => output > median).length

        const balance = aboveMedian/outputsAboveMedian
        return balance // If above one: the model is optimistic. Else, model is pessimistic.
    }

    const medianBalance = getMedianBalance(predictions, quartiles.median)

    const getQuartileBalance = (predictions:iItem[], quartiles:iQuartiles) => {
        const predictionsQ1 = predictions.filter(({ prediction }) => prediction < quartiles.q1).length
        const predictionsQ3 = predictions.filter(({ prediction }) => prediction > quartiles.q3).length

        const outputsQ1 = predictions.filter(({ output }) => output < quartiles.q1).length
        const outputsQ3 = predictions.filter(({ output }) => output > quartiles.q3).length

        const predictionDifference = predictionsQ1 - predictionsQ3
        const outputDifference = outputsQ1 - outputsQ3

        const numerator = predictionDifference - outputDifference
        const balance = numerator / predictions.length

        return balance // If positive, model is optimistic. If negative, model is pessimistic.
    }
    
    const quartileBalance = getQuartileBalance(predictions, quartiles)

    return { medianBalance, quartileBalance }
} // TODO: Consider max & top5 metrics.

const getAnomalyDetectionMetrics = (predictions:iItem[], quartiles:iQuartiles) => {
    const getQuartileDetection = (predictions:iItem[], quartiles:iQuartiles) => {
        const predictionsQ1 = predictions.filter(({ prediction }) => prediction < quartiles.q1).length
        const predictionsQ3 = predictions.filter(({ prediction }) => prediction > quartiles.q3).length

        const outputsQ1 = predictions.filter(({ output }) => output < quartiles.q1).length
        const outputsQ3 = predictions.filter(({ output }) => output > quartiles.q3).length

        const predictionsRatio = predictionsQ1 + predictionsQ3
        const outputsRatio = outputsQ1 + outputsQ3

        const detection = predictionsRatio/outputsRatio
        return detection // If positive, model is overestimating anomalies. Else, underestimating it.
    }

    const getMaxMinDistance = (predictions:iItem[]) => {
        const max = Math.max(...predictions.map(({ prediction }) => prediction))
        const min = Math.min(...predictions.map(({ prediction }) => prediction))

        const outputsMax = Math.max(...predictions.map(({ output }) => output))
        const outputsMin = Math.min(...predictions.map(({ output }) => output))

        const maxDistance = max/outputsMax
        const minDistance = outputsMin/min

        const ratio = (maxDistance + minDistance)/2

        // How far are predictions from the maximum and minimum values.
        return ratio // The smaller the better.
    } // TODO: Implement similar for neutrality.

    const getTopViews = (predictions:iItem[]) => {
        const top5Views = predictions.slice(0, 5).reduce((acc, { output }) => acc + output, 0) / 5
        const bottom5Views = predictions.slice(-5).reduce((acc, { output }) => acc + output, 0) / 5

        const top5Predictions = predictions.slice(0, 5).reduce((acc, { prediction }) => acc + prediction, 0) / 5
        const bottom5Predictions = predictions.slice(-5).reduce((acc, { prediction }) => acc + prediction, 0) / 5

        const topAccuracy = top5Views/top5Predictions
        const bottomAccuracy = bottom5Predictions/bottom5Views

        const ratio = (topAccuracy + bottomAccuracy)/2
        return ratio
    } // The smaller the better.

    const quartileDetection = getQuartileDetection(predictions, quartiles)
    const maxDistance = getMaxMinDistance(predictions)
    const topFiveDistance = getTopViews(predictions)

    return { quartileDetection, maxDistance, topFiveDistance }
}

interface iEvaluationMetrics {
    accuracy: {
        MLE: number
        correlation: number
        ranking: number
    }

    neutrality: {
        medianBalance: number
        quartileBalance: number
    }

    anomalyDetection: {
        quartileDetection: number
        maxDistance: number
        topFiveDistance: number
    }
}

export const evaluatePredictions = (predictions:iItem[], quartiles:iQuartiles, fileName:string) => {
    const accuracy = getAccuracyMetrics(predictions)
    const neutrality = getNeutralityMetrics(predictions, quartiles)
    const anomalyDetection = getAnomalyDetectionMetrics(predictions, quartiles)

    const evaluation = { accuracy, neutrality, anomalyDetection }
    writeFileSync(`${fileName}.json`, JSON.stringify(evaluation, null, 2))

    // TODO: Implement consistency metrics.
    return evaluation
}


export const compareReports = async(items:iItem[], report:string, reflexion:string, dir:string) => {
    const quartiles =  getQuartiles(items.map(({ output }) => output))
    const sampleItems = [...items].sort(() => Math.random() - 0.5).slice(0, 100)

    const reportPredictions = await makePredictions(sampleItems, report, quartiles, `${dir}/reportPredictions`)
    const newPredictions = await makePredictions(sampleItems, reflexion, quartiles, `${dir}/reflexionPredictions`)

    const evaluateReport = evaluatePredictions(reportPredictions, quartiles, `${dir}/reportEvaluation.json`)
    const evaluateReflexion = evaluatePredictions(newPredictions, quartiles, `${dir}/reflexionEvaluation.json`)

    const compareAccuracy = (evaluateReport:iEvaluationMetrics, evaluateReflexion:iEvaluationMetrics) => {
        const reportAccuracy = evaluateReport.accuracy
        const reflexionAccuracy = evaluateReflexion.accuracy

        let reportScore = 0

        // If MLE is lower, reportScore increases.
        reportAccuracy.MLE < reflexionAccuracy.MLE ? reportScore++ : reportScore--

        // If correlation is higher, reportScore increases.
        reportAccuracy.correlation > reflexionAccuracy.correlation ? reportScore++ : reportScore--

        // If ranking is higher, reportScore increases.
        reportAccuracy.ranking > reflexionAccuracy.ranking ? reportScore++ : reportScore--

        return reportScore
    }

    const accuracyScore = compareAccuracy(evaluateReport, evaluateReflexion)
    if(accuracyScore > 0) return report

    const compareNeutrality = (evaluateReport:iEvaluationMetrics, evaluateReflexion:iEvaluationMetrics) => {
        const reportNeutrality = evaluateReport.neutrality
        const reflexionNeutrality = evaluateReflexion.neutrality
        
        // The closer the median balance to one the better
        const medianDiff = Math.abs(1 - reportNeutrality.medianBalance)
        const reflexionMedianDiff = Math.abs(1 - reflexionNeutrality.medianBalance)

        // The closer the quartile balance to zero the better
        const quartileDiff = Math.abs(reportNeutrality.quartileBalance)
        const reflexionQuartileDiff = Math.abs(reflexionNeutrality.quartileBalance)

        // The smaller the diff the better
        const reportDiff = medianDiff + quartileDiff
        const reflexionDiff = reflexionMedianDiff + reflexionQuartileDiff

        // If negative report is better, if positive reflexion is better
        const diff = reportDiff - reflexionDiff
        return diff
    }

    const neutralityScore = compareNeutrality(evaluateReport, evaluateReflexion)
    // If neutralityScore is positive. Reflexion is better.
    if(neutralityScore > 0) return reflexion

    const compareAnomalyDetection = (evaluateReport:iEvaluationMetrics, evaluateReflexion:iEvaluationMetrics) => {
        const reportAnomalyDetection = evaluateReport.anomalyDetection
        const reflexionAnomalyDetection = evaluateReflexion.anomalyDetection

        let reportScore = 0

        // The closer the quartile detection to zero the better
        const quartileDiff = Math.abs(reportAnomalyDetection.quartileDetection)
        const reflexionQuartileDiff = Math.abs(reflexionAnomalyDetection.quartileDetection)
        quartileDiff < reflexionQuartileDiff ? reportScore++ : reportScore--

        // The smaller the max distance to zero the better
        const maxDiff = Math.abs(reportAnomalyDetection.maxDistance)
        const reflexionMaxDiff = Math.abs(reflexionAnomalyDetection.maxDistance)
        maxDiff < reflexionMaxDiff ? reportScore++ : reportScore--

        // The smaller the top five distance to zero the better
        const topDiff = Math.abs(reportAnomalyDetection.topFiveDistance)
        const reflexionTopDiff = Math.abs(reflexionAnomalyDetection.topFiveDistance)
        topDiff < reflexionTopDiff ? reportScore++ : reportScore--

        return reportScore // If positive, report is better. If negative, reflexion is better.
    }

    const anomalyDetectionScore = compareAnomalyDetection(evaluateReport, evaluateReflexion)
    if(anomalyDetectionScore > 0) return report

    writeFileSync(`${dir}/winner.txt`, anomalyDetectionScore > 0 ? 'report' : 'reflexion')
    return reflexion
}
