'use server'

export default async function search(formData: FormData) {
  console.log(formData.get('from'))
}
