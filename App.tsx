import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  I18nManager,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';

import MLKit from 'react-native-mlkit-ocr';

// Force RTL layout
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

interface Dish {
  name: string;
  price: number;
  selectedGuests: string[];
}

export default function App() {
  const [guestsInput, setGuestsInput] = useState('');
  const [guests, setGuests] = useState<string[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [totals, setTotals] = useState<
    { [guest: string]: { subtotal: number; total: number } }
  >({});

  const addGuests = () => {
    const names = guestsInput.split(',').map(n => n.trim()).filter(n => n.length > 0);
    setGuests(names);
    setGuestsInput('');
  };



  const captureAndRecognize = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.7,
    });

    if (result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri ?? null;
      setImageUri(uri);

      if (uri) {
        await recognizeText(uri);
      }
    }
  };

  const recognizeText = async (uri: string) => {
    try {
      const result = await MLKit.detectFromUri(uri);

      const fullText = result.map(block => block.text).join("\n");

      console.log("Recognized text:\n", fullText);

      
      parseDishesFromText(fullText);
    } catch (err) {
      console.error("OCR error:", err);
    }
  };


  const addDish = () => setDishes([...dishes, { name: '', price: 0, selectedGuests: [] }]);

  const removeDish = (index: number) => {
    const newDishes = [...dishes];
    newDishes.splice(index, 1);
    setDishes(newDishes);
  };

  const calculateTotals = () => {
    const tempTotals: { [guest: string]: { subtotal: number; total: number } } = {};
    guests.forEach(g => (tempTotals[g] = { subtotal: 0, total: 0 }));

    dishes.forEach(d => {
      if (d.selectedGuests.length === 0) return;
      const shareWithoutTip = d.price / d.selectedGuests.length;
      const shareWithTip = (d.price * (1 + tipPercent / 100)) / d.selectedGuests.length;

      d.selectedGuests.forEach(g => {
        tempTotals[g].subtotal += shareWithoutTip;
        tempTotals[g].total += shareWithTip;
      });
    });

    setTotals(tempTotals);
  };

  const toggleGuestForDish = (dishIndex: number, guest: string) => {
    const newDishes = [...dishes];
    const selected = newDishes[dishIndex].selectedGuests;
    if (selected.includes(guest)) {
      newDishes[dishIndex].selectedGuests = selected.filter(g => g !== guest);
    } else {
      newDishes[dishIndex].selectedGuests.push(guest);
    }
    setDishes(newDishes);
  };

  const parseDishesFromText = (recognizedText: string) => {
    const lines = recognizedText.split('\n');
    const newDishes: Dish[] = [];

    lines.forEach(line => {

      let cleanLine = line.replace(/[^\u0590-\u05FFa-zA-Z0-9\s.,₪]/g, "").trim();


      const match = cleanLine.match(/(.+?)\s+(\d+(?:[\.,]\d{1,2})?)(?:\s*₪|ש"ח)?$/);

      if (match) {
        const name = match[1].trim();
        const price = parseFloat(match[2].replace(",", "."));

        if (name.length > 1 && price > 5 && price < 1000) {
          newDishes.push({ name, price, selectedGuests: [] });
        }
      }
    });

    setDishes(prev => [...prev, ...newDishes]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>SplitBill 🍽️</Text>

      {/* Guests */}
      <Text style={styles.label}>הכנס שמות סועדים (מופרדים בפסיקים):</Text>
      <TextInput
        value={guestsInput}
        onChangeText={setGuestsInput}
        placeholder="לדוגמה: איתי, דני, מיכל"
        style={styles.input}
        textAlignVertical="top"
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={addGuests}>
        <Text style={styles.btnText}>הוסף סועדים</Text>
      </TouchableOpacity>

      {guests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>סועדים:</Text>
          <Text style={styles.rtlText}>{guests.join(', ')}</Text>
        </View>
      )}

      {/* Capture Receipt */}
      <TouchableOpacity style={styles.secondaryBtn} onPress={captureAndRecognize}>
        <Text style={styles.btnText}>📸 צלם חשבונית</Text>
      </TouchableOpacity>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} />}

      {/* Tip */}
      <Text style={styles.label}>טיפ (%):</Text>
      <TextInput
        keyboardType="numeric"
        value={tipPercent.toString()}
        onChangeText={text => setTipPercent(Number(text))}
        style={styles.input}
      />

      {/* Dishes */}
      <Text style={[styles.label, { marginTop: 15 }]}>מנות:</Text>
      {dishes.map((dish, index) => (
        <View key={index} style={styles.dishContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '600', color: '#333' }}>
              מנה {index + 1}
            </Text>
            <TouchableOpacity onPress={() => removeDish(index)}>
              <Text style={{ color: 'red', fontWeight: 'bold' }}>❌ הסר</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="שם מנה"
            value={dish.name}
            onChangeText={(text) => {
              const newDishes = [...dishes];
              newDishes[index].name = text;
              setDishes(newDishes);
            }}
            style={styles.input}
          />
          <TextInput
            placeholder="מחיר"
            keyboardType="numeric"
            value={dish.price.toString()}
            onChangeText={(text) => {
              const newDishes = [...dishes];
              newDishes[index].price = Number(text);
              setDishes(newDishes);
            }}
            style={styles.input}
          />

          <Text style={styles.label}>מי אכל את המנה?</Text>
          <View style={styles.guestsRow}>
            {guests.map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.guestBtn,
                  dish.selectedGuests.includes(g) && { backgroundColor: '#4caf50' },
                ]}
                onPress={() => toggleGuestForDish(index, g)}
              >
                <Text
                  style={{
                    color: dish.selectedGuests.includes(g) ? 'white' : 'black',
                    writingDirection: 'rtl',
                  }}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.floatingBtn} onPress={addDish}>
        <Text style={styles.btnText}>➕ הוסף מנה</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={calculateTotals}>
        <Text style={styles.btnText}>חשב תשלום לכל סועד</Text>
      </TouchableOpacity>

      {/* Totals */}
      {Object.keys(totals).length > 0 && (
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={[styles.label, { fontSize: 20, textAlign: 'center', marginBottom: 10 }]}>
            💰 סיכום החשבון
          </Text>

          {Object.entries(totals).map(([g, { subtotal, total }]) => (
            <View key={g} style={styles.totalCard}>
              <Text style={styles.totalName}>{g}</Text>
              <Text style={styles.totalLine}>לפני טיפ: ₪{subtotal.toFixed(2)}</Text>
              <Text style={styles.totalLine}>אחרי טיפ: ₪{total.toFixed(2)}</Text>
            </View>
          ))}

          {/* סיכום כללי */}
          <View style={[styles.totalCard, { backgroundColor: '#e3f2fd', marginTop: 15 }]}>
            <Text style={[styles.totalName, { color: '#0d47a1' }]}>סה״כ ארוחה</Text>
            <Text style={styles.totalLine}>
              לפני טיפ: ₪
              {Object.values(totals)
                .reduce((sum, t) => sum + t.subtotal, 0)
                .toFixed(2)}
            </Text>
            <Text style={styles.totalLine}>
              אחרי טיפ: ₪
              {Object.values(totals)
                .reduce((sum, t) => sum + t.total, 0)
                .toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fdfdfd', direction: 'rtl' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  label: { fontWeight: '600', marginVertical: 5, color: '#555', writingDirection: 'rtl' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    backgroundColor: '#fff',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  primaryBtn: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  secondaryBtn: {
    backgroundColor: '#ff9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  btnText: { color: 'white', fontWeight: 'bold', writingDirection: 'rtl' },
  section: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  dishContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    direction: 'rtl',
  },
  guestsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  guestBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    margin: 3,
  },
  floatingBtn: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
    marginVertical: 15,
    alignSelf: 'center',
    minWidth: 150,
  },
  totalText: { fontSize: 16, marginVertical: 2, color: '#333', writingDirection: 'rtl' },
  imagePreview: { width: '100%', height: 200, marginVertical: 10, borderRadius: 10 },
  totalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  totalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    writingDirection: 'rtl',
  },
  totalLine: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
    writingDirection: 'rtl',
  },
});
