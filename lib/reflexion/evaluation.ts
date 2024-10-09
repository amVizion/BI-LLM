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

import { iItem } from "../../app/src/utils/types";

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

        const numerator = x.reduce((acc, val, idx) => acc + (val - meanX) * (y[idx] - meanY), 0);
        const denominatorX = Math.sqrt(x.reduce((acc, val) => acc + Math.pow(val - meanX, 2), 0));
        const denominatorY = Math.sqrt(y.reduce((acc, val) => acc + Math.pow(val - meanY, 2), 0));

        const correlation = numerator / (denominatorX * denominatorY);
        return correlation
    }

    const correlation = getCorrelation(predictions)

    const getRanking = (predictions:iItem[]) => {
        const sortedPredictions = predictions.slice().sort((a, b) => a.prediction - b.prediction);
        const sortedOutputs = predictions.slice().sort((a, b) => a.output - b.output);

        const rankingDiffs = sortedPredictions.map((pred, idx) => {
            const outputIdx = sortedOutputs.findIndex(output => output.output === pred.output);
            return Math.abs(idx - outputIdx);
        });

        const ranking = rankingDiffs.reduce((acc, diff) => acc + diff, 0) / predictions.length;
        return ranking;
    }

    const ranking = getRanking(predictions)
    return { MLE, correlation, ranking }
}

export interface iQuartiles { q1:number, median:number, q3:number }
const getNeutralityMetrics = (predictions:iItem[], quartiles:iQuartiles) => {
    const getMedianBalance = (predictions:iItem[], median:number) => {
        const aboveMedian = predictions.filter(({ prediction }) => prediction > median).length
        const belowMedian = predictions.filter(({ prediction }) => prediction < median).length
        const predictionsRatio = aboveMedian / belowMedian

        const outputsAboveMedian = predictions.filter(({ output }) => output > median).length
        const outputsBelowMedian = predictions.filter(({ output }) => output < median).length

        const outputsRatio = outputsAboveMedian/outputsBelowMedian
        const balance = predictionsRatio - outputsRatio 

        return balance // If positive, model is optimistic. If negative, model is pessimistic.
    }

    const medianBalance = getMedianBalance(predictions, quartiles.median)

    const getQuartileBalance = (predictions:iItem[], quartiles:iQuartiles) => {
        const predictionsQ1 = predictions.filter(({ prediction }) => prediction < quartiles.q1).length
        const predictionsQ3 = predictions.filter(({ prediction }) => prediction > quartiles.q3).length

        const outputsQ1 = predictions.filter(({ output }) => output < quartiles.q1).length
        const outputsQ3 = predictions.filter(({ output }) => output > quartiles.q3).length

        const predictionsRatio = predictionsQ1 / predictionsQ3
        const outputsRatio = outputsQ1 / outputsQ3

        const balance = predictionsRatio - outputsRatio
        return balance // If positive, model is optimistic. If negative, model is pessimistic.
    }
    
    const quartileBalance = getQuartileBalance(predictions, quartiles)

    return { medianBalance, quartileBalance }
}

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

        const maxDistance = Math.abs(max - outputsMax)/outputsMax
        const minDistance = Math.abs(min - outputsMin)/outputsMin

        return { maxDistance, minDistance } // The smaller, the better.
    } // TODO: Implement similar for neutrality.

    const getTopViews = (predictions:iItem[]) => {
        const top5Views = predictions.slice(0, 5).reduce((acc, { output }) => acc + output, 0) / 5
        const bottom5Views = predictions.slice(-5).reduce((acc, { output }) => acc + output, 0) / 5

        const top5Predictions = predictions.slice(0, 5).reduce((acc, { prediction }) => acc + prediction, 0) / 5
        const bottom5Predictions = predictions.slice(-5).reduce((acc, { prediction }) => acc + prediction, 0) / 5

        const topAccuracy = Math.abs(top5Views - top5Predictions)/top5Views
        const bottomAccuracy = Math.abs(bottom5Views - bottom5Predictions)/bottom5Views

        return { topAccuracy, bottomAccuracy }
    }

    const quartileDetection = getQuartileDetection(predictions, quartiles)
    const maxMinDistance = getMaxMinDistance(predictions)
    const topBottom5MeanViews = getTopViews(predictions)

    return { quartileDetection, ...maxMinDistance, ...topBottom5MeanViews }
}

export const evaluatePredictions = (predictions:iItem[], quartiles:iQuartiles) => {
    const accuracy = getAccuracyMetrics(predictions)
    const neutrality = getNeutralityMetrics(predictions, quartiles)
    const anomalyDetection = getAnomalyDetectionMetrics(predictions, quartiles)

    // TODO: Implement consistency metrics.
    return { accuracy, neutrality, anomalyDetection }
}