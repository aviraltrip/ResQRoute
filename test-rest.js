async function testREST() {
  const url = "https://nvdgplyjlnzlfytarisx.supabase.co/rest/v1/Hotel?select=*";
  const apikey = "sb_publishable_f9dZ2xJ-ZZiygdCdU5Rw2A_m4zti6UQ";

  try {
    const res = await fetch(url, {
      headers: {
        apikey: apikey,
        Authorization: `Bearer ${apikey}`,
      },
    });
    console.log("REST API Status:", res.status);
    if (!res.ok) {
      console.log("Error text:", await res.text());
    } else {
      console.log("REST connection successful!");
    }
  } catch (e) {
    console.log("Fetch failed:", e.message);
  }
}

testREST();
