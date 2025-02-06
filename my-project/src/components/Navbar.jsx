
const Navbar = () => {
  return (
    <div className='px-4 flex flex-row  max-w-[1240px] mx-auto h-24 justify-end items-center text-black-100'>
     
      <h1 className="w-full text-3xl font-bold  text-[#141414] " >React</h1>
      <ul className="flex uppercase ">
        <li className=" p-4">Home</li>
        <li className="p-4">Event</li>
        <li className="p-4">Galeria</li>
        <li className="p-4">Formularz</li>
        <li className="p-4">Faq</li>
        <li className="p-4">Regulamin</li>
      </ul>
    </div>
  )
}

export default Navbar
