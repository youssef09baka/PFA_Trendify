const API_ROOT = 'http://localhost:3000/api';
(async()=>{
  try{
    const res = await fetch(`${API_ROOT}/feed?page=1&limit=5`);
    const data = await res.json();
    console.log('meta:', data.meta || {});
    console.log('items (first 5):');
    (data.items || []).slice(0,5).forEach((t,i)=>{
      console.log('--- item', i);
      console.log('id:', t._id || t.id);
      console.log('title:', t.title);
      console.log('score:', t.score);
      console.log('popularity:', t.popularity);
      console.log('searchVolume:', t.searchVolume);
      console.log('thumbnail:', t.thumbnail);
      console.log('image:', t.image);
      console.log('video:', t.video);
    });
  }catch(e){console.error(e.message)}
})();
