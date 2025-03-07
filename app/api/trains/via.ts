const get = async () => {
  try {
    const res = await fetch('https://tsimobile.viarail.ca/data/allData.json')
    const data = await res.json()
    return data
  } catch (error) {
    console.error('Error fetching Via Rail data:', error)
    throw error
  }
}

const parse = () => {}

const fetchAndParse = async () => {
  const data = await get()
  return parse(data)
}

export default fetchAndParse
