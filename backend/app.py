from flask import Flask, request, jsonify
from flask_cors import CORS
from logica_singularidad import resolver_viga_backend

app = Flask(__name__)
CORS(app) # Permite que tu frontend llame al backend sin errores de seguridad

@app.route('/calcular', methods=['POST'])
def calcular():
    data = request.json
    try:
        longitud = data['longitud']
        soportes = data['soportes']
        cargas = data['cargas']
        # Nuevos parámetros con valores por defecto
        perfil = data.get('perfil', 'WF') 
        fs = float(data.get('fs', 2.0))
        
        resultado = resolver_viga_backend(longitud, soportes, cargas, perfil, fs)
        
        return jsonify({
            'status': 'success',
            'data': resultado
        })
    except Exception as e:
        print(f"Error backend: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)