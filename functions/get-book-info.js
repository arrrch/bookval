export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const GOOGLE_API_KEY = env.GOOGLE_API_KEY;
    const searchType = query.match(/^\d{10,13}$/) ? 'isbn' : 'intitle'; // Detect if ISBN or text
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${searchType}:${query}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.totalItems === 0) {
      return new Response(JSON.stringify({ error: 'No book found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const book = data.items[0].volumeInfo;
    const saleInfo = data.items[0].saleInfo || {};
    
    const result = {
      title: book.title,
      authors: book.authors?.join(', ') || 'Unknown',
      isbn: book.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || query,
      description: book.description || 'No description available',
      coverImage: book.imageLinks?.thumbnail || '',
      prices: {
        listPrice: saleInfo.listPrice ? `${saleInfo.listPrice.amount} ${saleInfo.listPrice.currencyCode}` : 'N/A',
        retailPrice: saleInfo.retailPrice ? `${saleInfo.retailPrice.amount} ${saleInfo.retailPrice.currencyCode}` : 'N/A',
        buyLink: saleInfo.buyLink || 'https://books.google.com'
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch book info' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
