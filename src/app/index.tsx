import React from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const categories = [
  { name: "Rice", icon: "🍚", count: "24 items" },
  { name: "Atta", icon: "🌾", count: "18 items" },
  { name: "Masala", icon: "🌶️", count: "35 items" },
  { name: "Dal", icon: "🫘", count: "20 items" },
  { name: "Snacks", icon: "🍿", count: "42 items" },
  { name: "Drinks", icon: "🥤", count: "16 items" },
];

const products = [
  {
    id: "1",
    name: "India Gate Basmati Rice",
    size: "5 kg",
    price: "₩18,000",
    oldPrice: "₩21,000",
    rating: "4.9",
    reviews: "128",
    discount: "15% OFF",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800",
  },
  {
    id: "2",
    name: "Aashirvaad Whole Wheat Atta",
    size: "5 kg",
    price: "₩12,000",
    oldPrice: "₩14,500",
    rating: "4.8",
    reviews: "96",
    discount: "17% OFF",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
  },
  {
    id: "3",
    name: "Premium Indian Masala",
    size: "100 g",
    price: "₩4,500",
    oldPrice: "₩5,500",
    rating: "4.9",
    reviews: "74",
    discount: "18% OFF",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800",
  },
  {
    id: "4",
    name: "Tata Tea Premium",
    size: "250 g",
    price: "₩8,000",
    oldPrice: "₩9,500",
    rating: "4.8",
    reviews: "61",
    discount: "16% OFF",
    image:
      "https://images.unsplash.com/photo-1597318181409-cf64d0d3b7e6?w=800",
  },
];

export default function HomeScreen() {
  const [cartCount, setCartCount] = React.useState(2);
  const [search, setSearch] = React.useState("");
  const [wishlist, setWishlist] = React.useState<string[]>([]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => {} },
    ]);
  };

  const addToCart = (id: string) => {
    setCartCount((count) => count + 1);
  };

  const toggleWishlist = (id: string) => {
    setWishlist((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    );
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F7F3" />

      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcome}>WELCOME TO</Text>

              <Text style={styles.logo}>
                NAMASTE <Text style={styles.logoGold}>MART</Text>
              </Text>

              <Text style={styles.tagline}>
                Taste of India & Nepal 🇮🇳 🇳🇵
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.cartButton}>
                <Text style={styles.cartIcon}>🛒</Text>

                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutIcon}>🚪</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* LOCATION */}
          <TouchableOpacity style={styles.locationCard}>
            <View style={styles.locationCircle}>
              <Text>📍</Text>
            </View>

            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>DELIVERING TO</Text>

              <Text style={styles.location}>
                Seoul, South Korea
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* SEARCH */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search rice, atta, masala..."
              placeholderTextColor="#A2A2A2"
              value={search}
              onChangeText={setSearch}
            />

            
          </View>

          {/* HERO */}
          <View style={styles.hero}>
            <View style={styles.heroLeft}>
              <View style={styles.offerBadge}>
                <Text style={styles.offerText}>Send your parcel to your home</Text>
              </View>

              <Text style={styles.heroTitle}>
                Courier.
                {"\n"}
                Delivered To Your 
                Home.
              </Text>

              <Text style={styles.heroSubtitle}>
                
                {"\n"}
                Delivered across India and Nepal.
              </Text>

              <TouchableOpacity style={styles.heroButton}>
                <Text style={styles.heroButtonText}>
                  SEND NOW
                </Text>

                <Text style={styles.heroArrow}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroRight}>
              <Text style={styles.heroEmoji}> 📦 📦   </Text>
              <Text style={styles.heroFlag}>🇮🇳 🇳🇵</Text>
            </View>

            <View style={styles.decorCircleOne} />
            <View style={styles.decorCircleTwo} />
          </View>


          {/* SPECIAL OFFER */}
          <View style={styles.specialOffer}>
            <View>
              <Text style={styles.specialSmall}>
                LIMITED TIME OFFER
              </Text>

              <Text style={styles.specialTitle}>
                Free Delivery
              </Text>

              <Text style={styles.specialText}>
                On orders above ₩50,000
              </Text>

              <TouchableOpacity style={styles.specialButton}>
                <Text style={styles.specialButtonText}>
                  START SHOPPING →
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.deliveryEmoji}>🚚</Text>
          </View>

          {/* BENEFITS */}
          <View style={styles.benefitRow}>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>🚚</Text>

              <View>
                <Text style={styles.benefitTitle}>Fast Delivery</Text>
                <Text style={styles.benefitText}>Across India and Nepal</Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✓</Text>

              <View>
                <Text style={styles.benefitTitle}>100% Trusted</Text>
                <Text style={styles.benefitText}>low prices</Text>
              </View>
            </View>
          </View>

          {/* CATEGORIES */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <Text style={styles.sectionSubtitle}>
                Everything you love from home
              </Text>
            </View>

            <TouchableOpacity>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.name}
                style={styles.categoryCard}
              >
                <View style={styles.categoryImage}>
                  <Text style={styles.categoryEmoji}>
                    {category.icon}
                  </Text>
                </View>

                <Text style={styles.categoryName}>
                  {category.name}
                </Text>

                <Text style={styles.categoryCount}>
                  {category.count}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* BEST SELLERS */}
          <View style={styles.sectionHeader}>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.sectionTitle}>
                  Best Sellers
                </Text>

                <Text style={styles.fire}>🔥</Text>
              </View>

              <Text style={styles.sectionSubtitle}>
                Loved by our customers
              </Text>
            </View>

            <TouchableOpacity>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {/* PRODUCTS */}
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                activeOpacity={0.9}
              >
                <View style={styles.productImageContainer}>
                  <Image
                    source={{ uri: product.image }}
                    style={styles.productImage}
                  />

                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {product.discount}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.heartButton}>
                    <Text style={styles.heart}>♡</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.productDetails}>
                  <Text
                    style={styles.productName}
                    numberOfLines={2}
                  >
                    {product.name}
                  </Text>

                  <Text style={styles.productSize}>
                    {product.size}
                  </Text>

                  <View style={styles.ratingRow}>
                    <Text style={styles.star}>★</Text>

                    <Text style={styles.rating}>
                      {product.rating}
                    </Text>

                    <Text style={styles.review}>
                      ({product.reviews})
                    </Text>
                  </View>

                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.price}>
                        {product.price}
                      </Text>

                      <Text style={styles.oldPrice}>
                        {product.oldPrice}
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.addButton}>
                      <Text style={styles.plus}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>


          {filteredProducts.length === 0 && (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchIcon}>🔎</Text>
              <Text style={styles.emptySearchTitle}>No products found</Text>
              <Text style={styles.emptySearchText}>
                Try searching for rice, atta, masala or tea.
              </Text>
            </View>
          )}

          {/* TRUST */}
          <View style={styles.trustSection}>
            <Text style={styles.trustTitle}>
              Why choose Namaste Mart?
            </Text>

            <View style={styles.trustGrid}>
              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>🇮🇳</Text>
                <Text style={styles.trustItemTitle}>
                  Authentic
                </Text>
                <Text style={styles.trustItemText}>
                  Products from India
                </Text>
              </View>

              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>⚡</Text>
                <Text style={styles.trustItemTitle}>
                  Fast
                </Text>
                <Text style={styles.trustItemText}>
                  Quick delivery
                </Text>
              </View>

              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>🔒</Text>
                <Text style={styles.trustItemTitle}>
                  Secure
                </Text>
                <Text style={styles.trustItemText}>
                  Safe payment
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* BOTTOM NAV */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <View style={styles.activeNav}>
              <Text style={styles.navIcon}>⌂</Text>
            </View>
            <Text style={styles.activeNavText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIconInactive}>▦</Text>
            <Text style={styles.navText}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem}>
            <View style={styles.navCart}>
              <Text style={styles.navIconInactive}>💵</Text>

              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{cartCount}</Text>
              </View>
            </View>

            <Text style={styles.navText}>Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIconInactive}></Text>
            <Text style={styles.navText}>Wishlist</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIconInactive}>👤</Text>
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6F2",
  },

  scrollContent: {
    paddingTop: 8,
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  welcome: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "700",
    color: "#888",
  },

  logo: {
    fontSize: 24,
    fontWeight: "900",
    color: "#181818",
    letterSpacing: 1,
    marginTop: 3,
  },

  logoGold: {
    color: "#B8892D",
  },

  tagline: {
    fontSize: 10,
    color: "#777",
    marginTop: 3,
  },

  cartButton: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  cartIcon: {
    fontSize: 22,
  },

  cartBadge: {
    position: "absolute",
    right: -3,
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#B8892D",
    justifyContent: "center",
    alignItems: "center",
  },

  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  logoutButton: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#FFE0E0",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  logoutIcon: {
    fontSize: 22,
  },

  locationCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  locationCircle: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F5F0E5",
    justifyContent: "center",
    alignItems: "center",
  },

  locationInfo: {
    marginLeft: 10,
  },

  locationLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#999",
    letterSpacing: 1,
  },

  location: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    marginTop: 2,
  },

  chevron: {
    marginLeft: "auto",
    fontSize: 24,
    color: "#777",
  },

  searchContainer: {
    height: 54,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 15,
    paddingRight: 7,
  },

  searchIcon: {
    fontSize: 27,
    color: "#444",
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    color: "#222",
  },

  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#191919",
    alignItems: "center",
    justifyContent: "center",
  },

  filterIcon: {
    color: "#FFFFFF",
    fontSize: 21,
  },

  hero: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 210,
    borderRadius: 25,
    backgroundColor: "#222222",
    padding: 22,
    overflow: "hidden",
    flexDirection: "row",
  },

  heroLeft: {
    zIndex: 5,
  },

  offerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#B8892D",
    borderRadius: 7,
  },

  offerText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 12,
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
  },

  heroSubtitle: {
    marginTop: 8,
    color: "#BEBEBE",
    fontSize: 11,
    lineHeight: 17,
  },

  heroButton: {
    marginTop: 13,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },

  heroButtonText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#222",
  },

  heroArrow: {
    fontSize: 13,
    marginLeft: 8,
  },

  heroRight: {
    position: "absolute",
    right: 15,
    bottom: 18,
    alignItems: "center",
    zIndex: 4,
  },

  heroEmoji: {
    fontSize: 75,
  },

  heroFlag: {
    fontSize: 18,
    marginTop: -8,
  },

  decorCircleOne: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 100,
    right: -60,
    top: -55,
    backgroundColor: "#3A3428",
  },

  decorCircleTwo: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 100,
    right: 35,
    bottom: -70,
    backgroundColor: "#B8892D",
    opacity: 0.18,
  },

  benefitRow: {
    marginHorizontal: 20,
    marginTop: 13,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
  },

  benefit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  benefitIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: "#F7F1E3",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 18,
  },

  benefitTitle: {
    marginLeft: 8,
    fontSize: 10,
    fontWeight: "800",
  },

  benefitText: {
    marginLeft: 8,
    marginTop: 2,
    fontSize: 9,
    color: "#999",
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 27,
    marginBottom: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#202020",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: "#999",
  },

  seeAll: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A87521",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  fire: {
    fontSize: 18,
    marginLeft: 6,
  },

  categoryContainer: {
    paddingHorizontal: 20,
    gap: 11,
  },

  categoryCard: {
    width: 82,
    alignItems: "center",
  },

  categoryImage: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  categoryEmoji: {
    fontSize: 32,
  },

  categoryName: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: "800",
    color: "#333",
  },

  categoryCount: {
    marginTop: 2,
    fontSize: 8,
    color: "#999",
  },

  productGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  productCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
  },

  productImageContainer: {
    height: 145,
    backgroundColor: "#F1EFE9",
    position: "relative",
  },

  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  discountBadge: {
    position: "absolute",
    left: 9,
    top: 9,
    backgroundColor: "#C53B32",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  discountText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "900",
  },

  heartButton: {
    position: "absolute",
    right: 9,
    top: 9,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  heart: {
    fontSize: 21,
    color: "#333",
  },

  productDetails: {
    padding: 12,
  },

  productName: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    color: "#222",
    minHeight: 34,
  },

  productSize: {
    fontSize: 9,
    color: "#999",
    marginTop: 4,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  star: {
    color: "#D19A28",
    fontSize: 11,
  },

  rating: {
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 3,
  },

  review: {
    fontSize: 8,
    color: "#999",
    marginLeft: 3,
  },

  priceRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  price: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1D1D1D",
  },

  oldPrice: {
    fontSize: 9,
    color: "#A0A0A0",
    textDecorationLine: "line-through",
    marginTop: 2,
  },

  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#191919",
    justifyContent: "center",
    alignItems: "center",
  },

  plus: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "300",
  },

  specialOffer: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 22,
    backgroundColor: "#EFE6D2",
    padding: 20,
    minHeight: 145,
    overflow: "hidden",
    flexDirection: "row",
  },

  specialSmall: {
    color: "#9C701E",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  specialTitle: {
    marginTop: 6,
    fontSize: 23,
    fontWeight: "900",
    color: "#242424",
  },

  specialText: {
    marginTop: 3,
    color: "#777",
    fontSize: 10,
  },

  specialButton: {
    marginTop: 13,
    backgroundColor: "#191919",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  specialButtonText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },

  deliveryEmoji: {
    position: "absolute",
    right: 15,
    bottom: 18,
    fontSize: 55,
  },

  emptySearch: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 25,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },

  emptySearchIcon: {
    fontSize: 28,
  },

  emptySearchTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "900",
    color: "#222",
  },

  emptySearchText: {
    marginTop: 4,
    fontSize: 10,
    color: "#999",
    textAlign: "center",
  },

  trustSection: {
    marginHorizontal: 20,
    marginTop: 25,
  },

  trustTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 13,
  },

  trustGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  trustItem: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },

  trustIcon: {
    fontSize: 23,
  },

  trustItemTitle: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "900",
  },

  trustItemText: {
    marginTop: 3,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 7,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 55,
  },

  activeNav: {
    width: 38,
    height: 28,
    borderRadius: 12,
    backgroundColor: "#F3E8D1",
    alignItems: "center",
    justifyContent: "center",
  },

  navIcon: {
    fontSize: 19,
    color: "#A87521",
  },

  navIconInactive: {
    fontSize: 19,
    color: "#888",
    height: 28,
  },

  activeNavText: {
    fontSize: 8,
    color: "#A87521",
    fontWeight: "900",
    marginTop: 3,
  },

  navText: {
    fontSize: 8,
    color: "#888",
    marginTop: 3,
  },

  navCart: {
    position: "relative",
    height: 28,
  },

  navBadge: {
    position: "absolute",
    top: -7,
    right: -8,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#C53B32",
    justifyContent: "center",
    alignItems: "center",
  },

  navBadgeText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "900",
  },
});