/*

1. Generate report for vertical.
2. Generate sample prediction.
3. Generate summary.

On load or empty: <summarize>.
On content: <predict>.
On vertical: replace & generate.
	- On clear - go back.

*/


import { useEffect, useState } from "react"
import { getReport } from "../utils/prompts"

const OLLAMA_URL = 'http://localhost:11434/api/generate'


export const PromptBox = () => {
	const [prompt, setPrompt] = useState<string>('')
	const [loading, setLoading] = useState<boolean>(false)
	const [response, setResponse] = useState<string>('')

	const ollamaStream = async() => {
		try{
			setLoading(true)
			setResponse('')

			const body = JSON.stringify({ prompt, model:'mistral' })
			const response:Response = await fetch(OLLAMA_URL, { method: 'POST', body })
			const reader = response?.body?.getReader()
			
			while (true) {
				const { done, value } = await reader!.read()

				if (done) break
				const decodedValue = new TextDecoder().decode(value)
				console.log('decodedValue', decodedValue)
				const { response } = JSON.parse(decodedValue)
				setResponse((r) => `${r}${response}`)
			}
		} catch(e) { console.log(e) } 
		finally { setLoading(false) }
	} // TODO: Add try/catch with axios.

	useEffect(() => { 
		const reportPrompt = getReport()
		setPrompt(reportPrompt)
	}, [])

	return <div style={{maxWidth:1200, margin:'auto', marginBottom:32}}>
		<div className="field">
			<div className={`control ${loading && 'is-loading'}`}>
				<textarea 
					rows={12}
					value={response || prompt}
					className="textarea" 
					style={{color:'white'}}
					onChange={({ target }) => setPrompt(target.value)}
				/>
			</div>
		</div>

		<div className="field is-grouped is-justify-content-right">
			<div className="control">
				<button 
					className="button" 
					style={{marginRight:12}}
					onClick={() => setResponse('')}
				> Clear </button>

				<button 
					className={`button is-link ${loading && 'is-loading'}`} 
					onClick={ollamaStream}
				> Submit </button>
			</div>
		</div>
	</div>
}
