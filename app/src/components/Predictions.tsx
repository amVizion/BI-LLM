import { iCorrelation, iItem } from "../utils/types"
import { TD } from "./Correlations"


interface iPrediction {items:iItem[], correlations: iCorrelation[]}
export const Predictions = ({items, correlations}:iPrediction) => {
    const labels = correlations.map(({ label }) => label)
    const firstRowLength = Math.ceil((labels.length - 3)/2)

return <div className="table-container">
<table className='table is-fullwidth'>
    <thead>
        <tr className={'is-light'}>
            <th style={{color:'black', textAlign:'center'}} colSpan={11}> Predictions Table </th>
        </tr>
        <tr className={'is-light'}>
            <th style={{color:'black'}} rowSpan={2}> Text </th>
            <th style={{color:'black'}}> Outcome </th>
            <th style={{color:'black'}}> Prediction </th>
            <th style={{color:'black'}}> Cluster </th>

            { [...Array(firstRowLength)].map((_, i) => 
                <th style={{color:'black'}}> { labels[i] } </th>
            )}
        </tr>

        <tr className={'is-light'}>

            { [...Array(labels.length - firstRowLength)].map((_, i) => 
                <th style={{color:'black'}}> { labels[i+firstRowLength] } </th>
            )}
        </tr>
    </thead>

    <tbody>
        {items.sort(({prediction:a}, {prediction:b})=> a > b ? -1 : 1)
        .map((f, i) => <><tr key={i}>
            <td rowSpan={2}> {f.text} </td>
            <td> {f.output} </td>
            <TD value={f.prediction}/>
            <td> {f.cluster} </td>

            { [...Array(firstRowLength)].map((_, i) => 
                <TD value={ f.labels.find(({ label:l }) => l === labels[i])!.score } />
            )}
        </tr><tr>
        { [...Array(labels.length - firstRowLength)].map((_, i) => 
                <TD value={ f.labels.find(({ label:l }) => l === labels[i+firstRowLength])!.score } />
            )}

        </tr></>)}
    </tbody>
</table>
</div>}
