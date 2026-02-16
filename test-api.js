async function test() {
  try {
    const response = await fetch("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "vamsi is a student at gvpcdpgc and an international cricket player",
      }),
    });

    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Body:", text);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
