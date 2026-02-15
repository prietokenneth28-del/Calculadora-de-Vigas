import numpy as np
import sympy as sp
import matplotlib.pyplot as plt
from math import factorial
import io
import base64
import os
import zipfile
import xml.etree.ElementTree as ET

import matplotlib
matplotlib.use('Agg')

TIPOS_SOPORTE = {
    'fijo': 1,
    'móvil': 1,
    'movil': 1,
    'articulada': 1,
    'empotrado': 2,
    'libre': 0
}


def _normalizar_tipo(texto):
    return str(texto or '').strip().lower()


def _es_distribuida_rectangular(tipo):
    t = _normalizar_tipo(tipo)
    return 'distribuida' in t and 'rectangular' in t


def _es_distribuida_triangular_1(tipo):
    t = _normalizar_tipo(tipo)
    return 'distribuida' in t and 'triangular 1' in t


def _es_distribuida_triangular_2(tipo):
    t = _normalizar_tipo(tipo)
    return 'distribuida' in t and 'triangular 2' in t

# --- FUNCIONES MATEMÁTICAS ---
def singularidad_num(x_vals, a, n, A):
    heaviside = np.where(x_vals >= a, 1.0, 0.0)
    term = np.maximum(0.0, x_vals - a)
    if n == 0:
        val = A * heaviside
    else:
        val = (A / factorial(n)) * (term ** n)
    return val

# --- LÓGICA DE PERFILES ---
def buscar_perfiles_optimos(Sx_req, tipo_perfil):
    """
    Sx_req: Módulo de sección requerido en cm^3
    tipo_perfil: 'WF', 'HE', 'S', 'L'
    """
    
    # 1. Rutas absolutas (Igual que antes)
    directorio_actual = os.path.dirname(os.path.abspath(__file__))
    ruta_carpeta_perfiles = os.path.join(os.path.dirname(directorio_actual), 'perfiles')
    
    mapa_archivos = {
        'WF': 'WF.xlsx', 
        'HE': 'HE.xlsx',
        'S':  'S.xlsx',
        'L':  'L.xlsx'
    }
    
    nombre_archivo = mapa_archivos.get(tipo_perfil)
    if not nombre_archivo:
        return []

    archivo_excel = os.path.join(ruta_carpeta_perfiles, nombre_archivo)
    
    candidatos = []
    
    try:
        if not os.path.exists(archivo_excel):
            print(f"No encontrado: {archivo_excel}")
            return [{"Descripcion": "Error: Archivo no encontrado", "Sx": 0, "Peso": 0}]

        filas = _leer_filas_excel(archivo_excel)

        for row in filas:
            try:
                row_clean = {k.strip(): v for k, v in row.items() if k}

                if 'Sx' not in row_clean:
                    continue

                sx_row = float(row_clean['Sx'])

                if sx_row >= Sx_req:
                    candidatos.append({
                        'Descripcion': row_clean.get('Descripcion', 'Sin nombre'),
                        'Sx': sx_row,
                        'Peso': float(row_clean.get('Peso', 0)),
                        'A': float(row_clean.get('A', 0)),
                        'Ix': float(row_clean.get('Ix', 0))
                    })
            except (ValueError, KeyError, TypeError):
                continue
                    
        candidatos.sort(key=lambda x: x['Peso'])
        
        if not candidatos:
            return [{"Descripcion": "Ningún perfil cumple el requerimiento", "Sx": 0, "Peso": 0}]
            
        return candidatos[:10]

    except Exception as e:
        print(f"Error leyendo perfiles: {e}")
        return [{"Descripcion": f"Error: {str(e)}", "Sx": 0, "Peso": 0}]


def _leer_filas_excel(ruta_excel):
    """
    Lee la primera hoja de un archivo .xlsx sin dependencias externas
    y la retorna como lista de diccionarios.
    """
    ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    with zipfile.ZipFile(ruta_excel) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            root_strings = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in root_strings.findall('a:si', ns):
                texto = ''.join(t.text or '' for t in si.findall('.//a:t', ns))
                strings.append(texto)

        sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = sheet.findall('.//a:sheetData/a:row', ns)

        if not rows:
            return []

        encabezados = _parsear_fila_excel(rows[0], strings, ns)
        filas = []

        for row in rows[1:]:
            valores = _parsear_fila_excel(row, strings, ns)
            if not any(str(v).strip() for v in valores):
                continue

            registro = {}
            for i, head in enumerate(encabezados):
                if not head:
                    continue
                registro[head] = valores[i] if i < len(valores) else ''
            filas.append(registro)

        return filas


def _parsear_fila_excel(row_node, shared_strings, ns):
    valores = []

    for c in row_node.findall('a:c', ns):
        tipo = c.get('t')
        valor_node = c.find('a:v', ns)

        if valor_node is None:
            valores.append('')
            continue

        valor = valor_node.text or ''
        if tipo == 's':
            idx = int(valor)
            valor = shared_strings[idx] if idx < len(shared_strings) else ''

        valores.append(valor)

    return valores

# --- FUNCIÓN PRINCIPAL ---
def resolver_viga_backend(longitud, soportes_input, cargas_input, perfil_usuario="WF", fs_usuario=2.0):
    
    l = float(longitud)
    paso = l / 500.0
    x_vec = np.arange(0, l + paso, paso)
    y_num = np.zeros_like(x_vec)
    M_num = np.zeros_like(x_vec)
    v_num = np.zeros_like(x_vec)
    theta_num = np.zeros_like(x_vec)
    fed_list = []
    momentos_aplicados = 0
    a_ref = min(float(s['posicion']) for s in soportes_input) if soportes_input else 0.0
    
    # 1. Procesar Cargas (Igual que antes)
    for c in cargas_input:
        tipo = c.get('tipo', '')
        mag = float(c.get('magnitud'))
        
        if tipo == 'Puntual':
            pos = float(c.get('posicion'))
            y_num += singularidad_num(x_vec, pos, 3, mag)
            theta_num += singularidad_num(x_vec, pos, 2, mag)
            M_num += singularidad_num(x_vec, pos, 1, mag)
            v_num += singularidad_num(x_vec, pos, 0, mag)
            fed_list.append([mag, pos - a_ref])
        elif _es_distribuida_rectangular(tipo):
            inicio = float(c.get('inicio'))
            fin = float(c.get('fin'))
            longitud_c = fin - inicio
            y_num += (singularidad_num(x_vec, inicio, 4, mag) - singularidad_num(x_vec, fin, 4, mag))
            theta_num += (singularidad_num(x_vec, inicio, 3, mag) - singularidad_num(x_vec, fin, 3, mag))
            M_num += (singularidad_num(x_vec, inicio, 2, mag) - singularidad_num(x_vec, fin, 2, mag))
            v_num += (singularidad_num(x_vec, inicio, 1, mag) - singularidad_num(x_vec, fin, 1, mag))
            fed_list.append([mag * longitud_c, (inicio + longitud_c/2) - a_ref])
        elif _es_distribuida_triangular_1(tipo):
            inicio = float(c.get('inicio'))
            fin = float(c.get('fin'))
            longitud_c = inicio - fin
            if longitud_c == 0:
                continue

            y_num += (
                singularidad_num(x_vec, inicio, 5, mag)/longitud_c
                - singularidad_num(x_vec, fin, 5, mag)/longitud_c
                - singularidad_num(x_vec, fin, 4, mag)
            )
            theta_num += (
                singularidad_num(x_vec, inicio, 4, mag)/longitud_c
                - singularidad_num(x_vec, fin, 4, mag)/longitud_c
                - singularidad_num(x_vec, fin, 3, mag)
            )
            M_num += (
                singularidad_num(x_vec, inicio, 3, mag)/longitud_c
                - singularidad_num(x_vec, fin, 3, mag)/longitud_c
                - singularidad_num(x_vec, fin, 2, mag)
            )
            v_num += (
                singularidad_num(x_vec, inicio, 2, mag)/longitud_c
                - singularidad_num(x_vec, fin, 2, mag)/longitud_c
                - singularidad_num(x_vec, fin, 1, mag)
            )
            fed_list.append([mag * longitud_c / 2, (inicio + (longitud_c * (2/3))) - a_ref])
        elif _es_distribuida_triangular_2(tipo):
            inicio = float(c.get('inicio'))
            fin = float(c.get('fin'))
            longitud_c = inicio - fin
            if longitud_c == 0:
                continue

            y_num += (
                singularidad_num(x_vec, inicio, 4, mag)
                - singularidad_num(x_vec, inicio, 5, mag)/longitud_c
                + singularidad_num(x_vec, fin, 5, mag)/longitud_c
            )
            theta_num += (
                singularidad_num(x_vec, inicio, 3, mag)
                - singularidad_num(x_vec, inicio, 4, mag)/longitud_c
                + singularidad_num(x_vec, fin, 4, mag)/longitud_c
            )
            M_num += (
                singularidad_num(x_vec, inicio, 2, mag)
                - singularidad_num(x_vec, inicio, 3, mag)/longitud_c
                + singularidad_num(x_vec, fin, 3, mag)/longitud_c
            )
            v_num += (
                singularidad_num(x_vec, inicio, 1, mag)
                - singularidad_num(x_vec, inicio, 2, mag)/longitud_c
                + singularidad_num(x_vec, fin, 2, mag)/longitud_c
            )
            fed_list.append([mag * longitud_c / 2, (inicio + (longitud_c * (1/3))) - a_ref])
        elif tipo == 'Momento':
            pos = float(c.get('posicion'))
            y_num += singularidad_num(x_vec, pos, 2, mag)
            theta_num += singularidad_num(x_vec, pos, 1, mag)
            M_num += singularidad_num(x_vec, pos, 0, mag)
            momentos_aplicados += mag

    # 2. Resolución Simbólica (Igual que antes)
    x_sym, c1, c2 = sp.symbols('x c1 c2')
    R_sym = sp.symbols(f'R0:{len(soportes_input)}')
    empotrados_idx = [i for i, s in enumerate(soportes_input) if _normalizar_tipo(s.get('tipo')) == 'empotrado']
    M_emp_sym = sp.symbols(f'M0:{len(empotrados_idx)}')
    deflexion_reacc_sym = 0
    rotacion_reacc_sym = 0
    fuerzas_reacc_eq_sym = 0
    momento_eq_sym = 0
    
    for i, s in enumerate(soportes_input):
        r_pos = float(s['posicion'])
        deflexion_reacc_sym += (R_sym[i] / 6) * (x_sym - r_pos)**3 * sp.Heaviside(x_sym - r_pos)
        rotacion_reacc_sym += (R_sym[i] / 2) * (x_sym - r_pos)**2 * sp.Heaviside(x_sym - r_pos)
        fuerzas_reacc_eq_sym += R_sym[i]

        if _normalizar_tipo(s.get('tipo')) == 'empotrado':
            m_idx = empotrados_idx.index(i)
            deflexion_reacc_sym += (M_emp_sym[m_idx] / 2) * (x_sym - r_pos)**2 * sp.Heaviside(x_sym - r_pos)
            rotacion_reacc_sym += M_emp_sym[m_idx] * (x_sym - r_pos) * sp.Heaviside(x_sym - r_pos)

    for i, _ in enumerate(empotrados_idx):
        momento_eq_sym += M_emp_sym[i]

    deflexion_total_sym = deflexion_reacc_sym + c1*x_sym + c2
    rotacion_total_sym = rotacion_reacc_sym + c1
    ecuaciones = []

    for s in soportes_input:
        r_pos = float(s['posicion'])
        idx = int(round(r_pos / paso))
        if idx >= len(y_num): idx = len(y_num) - 1
        ecuaciones.append(deflexion_total_sym.subs(x_sym, r_pos) + y_num[idx])
        if _normalizar_tipo(s.get('tipo')) == 'empotrado':
            ecuaciones.append(rotacion_total_sym.subs(x_sym, r_pos) + theta_num[idx])

    sum_f = sum([f[0] for f in fed_list])
    sum_m = sum([f[0] * f[1] for f in fed_list]) + momentos_aplicados
    ecuaciones.append(fuerzas_reacc_eq_sym + sum_f)
    ecuaciones.append(sum((R_sym[i] * (float(s['posicion']) - a_ref)) for i, s in enumerate(soportes_input)) + momento_eq_sym + sum_m)
    
    incognitas = list(R_sym) + list(M_emp_sym) + [c1, c2]
    # Nota: solve puede ser lento, asegúrate de manejar excepciones
    try:
        solucion = sp.solve(ecuaciones, incognitas)
    except:
        solucion = {}

    resultados_reacciones = []
    for i, s in enumerate(soportes_input):
        if R_sym[i] in solucion:
            r_val = float(solucion[R_sym[i]])
            v_num += singularidad_num(x_vec, float(s['posicion']), 0, r_val)
            M_num += singularidad_num(x_vec, float(s['posicion']), 1, r_val)
            resultados_reacciones.append({'id': i, 'posicion': s['posicion'], 'magnitud': round(r_val, 2), 'tipo': s['tipo']})

    for i, s_idx in enumerate(empotrados_idx):
        if M_emp_sym[i] in solucion:
            m_val = float(solucion[M_emp_sym[i]])
            pos = float(soportes_input[s_idx]['posicion'])
            M_num -= singularidad_num(x_vec, pos, 0, m_val)

    # -------------------------------------------------------------------------
    # --- NUEVA LÓGICA: ANÁLISIS DE ESFUERZO ---
    
    # 1. Obtener Momento Máximo Absoluto [kN.m]
    if len(M_num) > 0:
        M_max_val = np.max(np.abs(M_num))
    else:
        M_max_val = 0

    # 2. Definir Esfuerzo de Fluencia (Sy)
    # A-36 Acero: Sy aprox 250 MPa = 25 kN/cm^2
    Sy_kNcms = 25.0 
    
    # 3. Calcular Esfuerzo Permisible
    # FS viene del usuario
    Sigma_per = Sy_kNcms / float(fs_usuario) # [kN/cm^2]

    # 4. Calcular Módulo de Sección Requerido (Sx_req)
    if Sigma_per > 0:
        Sx_req = (M_max_val * 100) / Sigma_per # [cm^3]
    else:
        Sx_req = 0

    # 5. Buscar en la base de datos CSV
    perfiles_sugeridos = buscar_perfiles_optimos(Sx_req, perfil_usuario)

    # -------------------------------------------------------------------------
    # Generación de Imágenes (Igual que antes)
    graficos_base64 = {}
    def plot_to_base64(x, y, titulo, color, ylabel):
        fig, ax = plt.subplots(figsize=(10, 4))
        ax.plot(x, y, 'k', linewidth=2)
        ax.fill_between(x, y, color=color, alpha=0.5)
        ax.set_title(titulo)
        ax.set_ylabel(ylabel)
        ax.grid(True)
        ax.axhline(0, color='black', linewidth=1)
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    graficos_base64['cortante'] = plot_to_base64(x_vec, v_num, 'Cortante', '#0072BD', 'V [kN]')
    graficos_base64['momento'] = plot_to_base64(x_vec, M_num, 'Momento', '#D95319', 'M [kN.m]')

    return {
        "reacciones": resultados_reacciones,
        "graficos": graficos_base64,
        "diseño": {
            "Mmax": round(M_max_val, 2),
            "Sx_req": round(Sx_req, 2),
            "perfiles": perfiles_sugeridos
        }
    }