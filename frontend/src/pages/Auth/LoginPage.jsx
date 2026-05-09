function LoginPage() {
  return (
    <div className='min-h-screen bg-[#0B1120] flex items-center justify-center'>
      <div className='bg-[#111827] border border-gray-800 rounded-2xl p-10 w-[400px]'>
        <h1 className='text-3xl font-bold text-white mb-8'>
          Login
        </h1>

        <div className='space-y-5'>
          <input
            type='email'
            placeholder='Email'
            className='w-full bg-[#0B1120] border border-gray-700 rounded-xl p-4 text-white'
          />

          <input
            type='password'
            placeholder='Password'
            className='w-full bg-[#0B1120] border border-gray-700 rounded-xl p-4 text-white'
          />

          <button className='w-full bg-purple-600 hover:bg-purple-700 transition-all rounded-xl py-4 font-semibold text-white'>
            Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage