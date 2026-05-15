const HeroSection = () => {
  return (
    <>
      <div className="h-screen flex items-center justify-center p-4">
        <div className="w-full h-full bg-[url('/heroImage.jpg')] bg-cover bg-center rounded-2xl flex items-center justify-center flex-col relative overflow-hidden">
          <h1 className="text-9xl font-melodrama text-white">
            Every photo. Only yours.
          </h1>
          <p className="text-xl text-white mt-4">
            Momnts scans every photo from your event and instantly builds your
            personal gallery.
          </p>
          <div>
            
          </div>
        </div>
      </div>
    </>
  );
};

export default HeroSection;
