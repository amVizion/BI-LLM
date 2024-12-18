import startups from '../ignore/data/startups/startups.json'
import { writeFileSync } from 'fs'
import path from 'path'

const index = () => {
    const texts = startups.map(({ long_description, team_size }) => ({
        text: long_description, 
        output: team_size || 0
    }))

    const filesName = path.join(__dirname, '../ignore/data/startups/texts.json')

    writeFileSync(filesName, JSON.stringify(texts, null, 2))
    return texts
}

index()

