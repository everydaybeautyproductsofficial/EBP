// =============================================
// POSTS.JS – All blog posts
// To add a post: copy any block below,
// paste before the last ]; and fill in your details.
  // -----------------------------------------------
  // ADD NEW POSTS ABOVE THIS LINE
  // Copy the block below, paste above, and fill in:
  // -----------------------------------------------
  // {
  //   id: 7, category: 'Skin Care',
  //   href: '/blog/anti-aging.html',
  //   title: 'Your Post Title Here',
  //   excerpt: 'Short summary shown on the blog listing page.',
  //   author: 'Dr. Sarah Collins',
  //   createdAt: '2026-06-13T10:00:00Z',
  //   img: '/assets/images/blog/your-image.jpg',
  //   tags: ['Tag1', 'Tag2'],
  // },
  // =============================================

// NAYA BLOG POST ADD KARTE WAQT — CHECKLIST
// Total 4 jagah touch karni hain:
// =============================================
//
// 1) YAHIN POSTS.JS MEIN:
//
// 2) blog/tumhara-naya-post.html
//    ⚠️ SAB SE ZAROORI: <script>window.POST_ID = 1;</script>
//    ye number posts.js ke "id" se EXACTLY match hona chahiye,
//    warna post-page.js post dhoond nahi payega aur pura page
//    (sidebar, related products, meta tags) khaali reh jayega.
//
// 3) assets/images/blog/tumhari-image.jpg
//
// 4) sitemap.xml
//    
// =============================================

const rawPosts = [
{
  id: 6,
  category: 'Fragrance',
  href: '/blog/best-perfume-for-summer-female-2026.html',
  title: 'Best Perfume for Summer Female 2026 – Top 10 Picks',
  excerpt: "Discover the best perfume for summer female 2026 — top 10 women's fragrances, new releases for her, and long-lasting scents reviewed with honest insight.",
  author: 'Maya Rodriguez',
  createdAt: '2026-08-03T10:00:00Z',
  img: '/assets/images/blog/best-perfume-for-summer-female-2026.jpg',
  tags: [
    'best perfume for summer female 2026',
    'top 10 perfume for women 2026',
    'summer perfume for women',
    'best perfumes for women 2026'
  ],
},
{
  id: 5,
  category: 'Personal Care',
  href: '/blog/how-to-use-oil-cleanser.html',
  title: 'How to Use Oil Cleanser: Easy Step-by-Step Guide In 2026',
  excerpt: 'Learn how to use oil cleanser the right way — on face and body, Korean-style, for blackheads, sebaceous filaments, and everyday skin health.',
  author: 'Dr. Sarah Collins',
  createdAt: '2026-08-02T10:00:00Z',
  img: '/assets/images/blog/how-to-use-oil-cleanser.jpg',
  tags: [
    'how to use oil cleanser',
    'oil cleansing',
    'double cleanse',
    'blackheads',
    'sebaceous filaments'
  ],
},
{
  id: 4,
  category: 'Skin Care',
  href: '/blog/best-hydrating-face-mist.html',
  title: 'Best Facial Mist: Top Hydrating Picks for Every Skin Type',
  excerpt: 'Searching for the best face mist? We tested top hydrating sprays including BIODANCE to see which ones truly hydrate, prep skin, and give an instant glow.',
  author: 'Dr. Sarah Collins',
  createdAt: '2026-08-01T10:00:00Z',
  img: '/assets/images/blog/best-hydrating-face-mist.jpg',
  tags: [
    'best face mist',
    'best hydrating face mist',
    'best hydrating face mist for oily skin',
    'best hydrating face mist for dry skin',
    'best hydrating face mist for glowing skin',
    'best hydrating face mist for travel',
    'best hydrating face mist for over makeup',
    'best hydrating face mist korean'
  ],
},
{
  id: 3,
  category: 'Foot, Hand & Nail',
  href: '/blog/hailey-bieber-opi-blue-nails.html',
  title: "Hailey Bieber's Blue Nails Meet the Summer's Coolest Trend",
  excerpt: "Hailey Bieber's cerulean-blue manicure has everyone hunting for the exact polish. Here's the OPI shade that matches, plus how to recreate the look at home.",
  author: 'Maya Rodriguez',
  createdAt: '2026-08-01T10:00:00Z',
  img: '/assets/images/blog/hailey-bieber-opi-blue-nails.jpg',
  tags: [
    'Hailey Bieber nail color',
    'Hailey Bieber blue nails',
    'OPI blue nail polish',
    'cool toned nails trend',
    'summer nail colors 2026'
  ],
},
{
  id: 2,
  category: 'Hair Care',
  href: '/blog/sadie-sink-red-hair-effect.html',
  title: 'The Sadie Sink Hair Effect: Why Gen Z Is Going Red in 2026',
  excerpt: "Colorists say Sadie Sink is behind 2026's biggest hair trend. Here's why Gen Z is ditching blonde for copper red, and how to get the look yourself.",
  author: 'Maya Rodriguez',
  createdAt: '2026-07-31T10:00:00Z',
  img: '/assets/images/blog/sadie-sink-red-hair-effect.jpg',
  tags: [
    'Sadie Sink hair color',
    'Sadie Sink red hair',
    'the Sadie Sink effect',
    'Gen Z red hair trend',
    'Sadie Sink natural hair color'
  ],
},
{
  id: 1,
  category: 'Makeup',
  href: '/blog/ashley-tisdale-10-minute-beauty-routine.html',
  title: "Ashley Tisdale's 10-Minute Routine for a Minimalist Summer Look",
  excerpt: 'See how Ashley Tisdale builds her bare, sun-kissed summer look in just 10 minutes — simple skincare, soft glam makeup, and the everyday routine behind her glow.',
  author: 'Maya Rodriguez',
  createdAt: '2026-07-31T10:00:00Z',
  img: '/assets/images/blog/ashley-tisdale-10-minute-beauty-routine.jpg',
  tags: [
    'Ashley Tisdale',
    'Celebrity Beauty',
    'Makeup',
    'Minimalist Summer Look',
    '10 Minute Beauty Routine'
  ],
}
];
export const blogPosts = rawPosts
  .slice()
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));