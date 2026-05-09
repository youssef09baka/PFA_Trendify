function KPIcard({ title, value }) {
  return (
    <div className='bg-[#111827] border border-gray-800 rounded-2xl p-6'>
      <p className='text-gray-400'>
        {title}
      </p>

      <h2 className='text-4xl font-bold mt-4'>
        {value}
      </h2>
    </div>
  )
}

export default KPIcard