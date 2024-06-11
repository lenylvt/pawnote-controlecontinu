import streamlit as st
import requests
from pyzbar.pyzbar import decode
from PIL import Image
import pandas as pd

# Définition de l'URL de l'API
API_URL = "http://localhost:3000/cc"

def call_api(jeton, login, url):
    """Envoyer une requête à l'API et renvoyer la réponse."""
    try:
        response = requests.get(API_URL, params={'jeton': jeton, 'login': login, 'url': url})
        if response.status_code == 200:
            return response.json()
        else:
            return {'error': f"Échec de l'appel API avec le statut: {response.status_code}", 'message': response.text}
    except requests.exceptions.RequestException as e:
        return {'error': 'Exception lors de l’appel API', 'message': str(e)}

def decode_qr(image):
    """Décoder le QR code de l'image téléchargée et extraire les données."""
    try:
        image_data = decode(image)
        if image_data:
            qr_data = image_data[0].data.decode('utf-8')
            return eval(qr_data)  # Convertir le dictionnaire en chaîne en dictionnaire réel
        else:
            return None
    except Exception as e:
        return {'error': 'Échec du décodage du QR code', 'message': str(e)}

# Interface utilisateur
st.title('Contrôle Continu 🎓')

st.markdown("### Comment obtenir le code QR ?")
st.markdown("1. Connectez-vous à votre compte Pronote à l'adresse https://0952236p.index-education.net/pronote/eleve.html.")
st.markdown("2. Cliquez sur l'onglet **Mes données**.")
st.markdown("3. Puis sur **Code QR de l'application**.")
st.markdown("4. Dans **Code de vérification à 4 chiffres** entrez : *0000*")
st.markdown("5. Cliquez sur **Générer le code QR**.")
st.markdown("6. Prenez une capture d'écran (Windows : **Windows + Maj + S** ou **Impr. écran** | Mac : **Cmd + Maj + 4**).")
st.markdown("7. Chargez-la ici.")

st.divider()

qr_file = st.file_uploader("Téléchargez le code QR 📷", type=["png", "jpg", "jpeg"])

if qr_file:
    image = Image.open(qr_file)
    qr_result = decode_qr(image)
    if qr_result:
        if 'error' in qr_result:
            st.error(qr_result['error'])
            st.caption(qr_result['message'])
        else:
            jeton = qr_result.get('jeton', '')
            login = qr_result.get('login', '')
            url = qr_result.get('url', '')
            st.session_state['jeton'] = jeton
            st.session_state['login'] = login
            st.session_state['url'] = url

if st.button('Récupérer les données 🚀'):
    if 'jeton' in st.session_state and 'login' in st.session_state and 'url' in st.session_state:
        result = call_api(st.session_state['jeton'], st.session_state['login'], st.session_state['url'])
        if 'error' in result:
            st.error(result['error'])
            st.text(result['message'])
        else:
            st.success("Données récupérées avec succès !")
            st.subheader("Résumé des points de contrôle continu")
            col1, col2, col3 = st.columns(3)
            col1.metric("Rondi au + Proche (Control Continu)", result['totalAveragePoints'])
            col2.metric("Rondi en Dessous", result['totalAveragePointsMin'])
            col3.metric("Rondi en Dessus", result['totalAveragePointsMax'])

            # Tableau avec détails étendus
            with st.expander("Voir les résultats détaillés des évaluations 🔍"):
                df_details = pd.DataFrame({
                    "Domaine": list(result['details']['pointsByPrefix'].keys()),
                    "Points Totals": list(result['details']['pointsByPrefix'].values()),
                    "Nombre de Notes": list(result['details']['countByPrefix'].values()),
                    "Points Moyens": [round(pts / cnt) for pts, cnt in zip(result['details']['pointsByPrefix'].values(), result['details']['countByPrefix'].values())]
                })
                st.table(df_details)
    else:
        st.error("Veuillez remplir tous les paramètres ou télécharger un code QR valide.")