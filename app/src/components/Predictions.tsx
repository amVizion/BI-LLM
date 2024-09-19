import { numberFormater } from "../utils/utils"
import { iCluster, iItem } from "../utils/types"
import CORRELATIONS from '../data/correlations.json'

interface iPrediction {items:iItem[], clusters?:iCluster[]}
export const Predictions = ({items, clusters}:iPrediction) => {

return <div className="table-container">
<table className='table is-fullwidth'>
    <thead>
        <tr className={'is-light'}>
            <th style={{color:'black', textAlign:'center'}} colSpan={9}> 
                Predictions Table 
            </th>
        </tr>

        <tr className={'is-light'}>
            <th style={{color:'black', minWidth:340}}> Text </th>
            <th style={{color:'black'}}> Outcome </th>
            <th style={{color:'black'}}> Prediction </th>
            {/* TODO: Include difference (Maybe as standard deviation). */}
            { clusters && <th style={{color:'black'}}> Cluster </th> }

            { [...Array(5)].map((_, i) => 
                <th style={{color:'black'}}> No. { i } </th>
            )}
        </tr>
    </thead>

    <tbody>
        {items.sort(({output:a}, {output:b})=> a > b ? -1 : 1)
        .map((f, i) => {

            const sortedLabels = f.labels.sort((a, b) => 
                (a.score - CORRELATIONS.find(({label}) => a.label === label)!.mean) > 
                (b.score - CORRELATIONS.find(({label}) => b.label === label)!.mean)
                ? -1 : 1
            )
            return <tr key={i}>
                <td style={{maxWidth:360}}> {f.text} </td>
                <td> {numberFormater(f.output)} </td>
                <td> {numberFormater(f.prediction)} </td>
                { clusters && <td> {clusters[f.cluster].name} </td> }

                { [...Array(5)].map((_, i) => <td> 
                    { sortedLabels[i].label } ( 
                        {Math.round(sortedLabels[i].score)}/ 
                        {Math.round(CORRELATIONS.find(({label}) => sortedLabels[i].label === label)!.mean)}
                    )
                </td>)}
            </tr>
        })}
    </tbody>
</table>
</div>}
