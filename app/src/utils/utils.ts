export const numberFormater = (value:string|number) => {
    const number = Number(value)
    if(number > 1000000000) return Math.round(number/1000000000).toString() + 'B'
    if(number > 1000000) return Math.round(number/100000).toString() + 'M'
    if(number > 1000) return Math.round(number/1000).toString() + 'K'

    return Math.round(number).toString()
}
