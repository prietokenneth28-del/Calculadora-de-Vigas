import numpy as np
import sympy as sp
import matplotlib.pyplot as plt
from math import factorial
import io
import base64

# Configuramos Matplotlib para que no necesite interfaz gráfica (backend 'Agg')
import matplotlib
matplotlib.use('Agg')

def singularidad_num(x_vals, a, n, A):
    heaviside = np.where(x_vals >= a, 1.0, 0.0)
    term = np.maximum(0.0, x_vals - a)
    if n == 0:
        val = A * heaviside
    else:
        val = (A / factorial(n)) * (term ** n)
    return val

def resolver_viga_backend(longitud, soportes_input, cargas_input):
    """
    longitud: float
    soportes_input: lista de dicts [{'posicion': float, 'tipo': str}, ...]
    cargas_input: lista de dicts [{'tipo': str, 'magnitud': float, 'posicion': float, 'inicio': float, 'fin': float}]
    """
    
    # 1. Configuración Inicial
    l = float(longitud)
    paso = l / 500.0 # Ajuste dinámico de resolución
    x_vec = np.arange(0, l + paso, paso)
    
    # Mapeo de constantes
    TIPO_PUNTUAL = "Puntual"
    TIPO_MOMENTO = "Momento"
    TIPO_DIST_RECT = "Distribuida (Rectangular)"
    # ... mapear otros si es necesario

    # 2. Procesar Cargas para Numérico
    y_num = np.zeros_like(x_vec)
    M_num = np.zeros_like(x_vec)
    v_num = np.zeros_like(x_vec)
    
    fed_list = [] # Fuerzas equivalentes para equilibrio
    momentos_aplicados = 0
    
    # Normalizar input de cargas a tu lógica interna
    # Nota: Tu frontend envía 'inicio' y 'fin' para distribuidas, y 'posicion' para puntuales
    
    for c in cargas_input:
        tipo = c.get('tipo')
        mag = float(c.get('magnitud'))
        
        # En tu lógica original las cargas hacia abajo eran negativas.
        # Aseguramos que si el usuario pone positivo, y es carga de gravedad, sea negativo si tu convención lo requiere.
        # Asumiremos que el frontend envía el signo correcto o ajustamos aquí.
        
        if tipo == 'Puntual':
            pos = float(c.get('posicion'))
            y_num += singularidad_num(x_vec, pos, 3, mag)
            M_num += singularidad_num(x_vec, pos, 1, mag)
            v_num += singularidad_num(x_vec, pos, 0, mag)
            fed_list.append([mag, pos])
            
        elif 'Distribuida' in tipo:
            inicio = float(c.get('inicio'))
            fin = float(c.get('fin'))
            longitud_c = fin - inicio
            
            if 'Rectangular' in tipo:
                y_num += (singularidad_num(x_vec, inicio, 4, mag) - singularidad_num(x_vec, fin, 4, mag))
                M_num += (singularidad_num(x_vec, inicio, 2, mag) - singularidad_num(x_vec, fin, 2, mag))
                v_num += (singularidad_num(x_vec, inicio, 1, mag) - singularidad_num(x_vec, fin, 1, mag))
                
                fed_list.append([mag * longitud_c, inicio + longitud_c/2])

        elif tipo == 'Momento':
            pos = float(c.get('posicion'))
            y_num += singularidad_num(x_vec, pos, 2, mag)
            M_num += singularidad_num(x_vec, pos, 0, mag)
            momentos_aplicados += mag

    # 3. Resolución Simbólica de Reacciones
    x_sym, c1, c2 = sp.symbols('x c1 c2')
    num_reacciones = len(soportes_input)
    R_sym = sp.symbols(f'R0:{num_reacciones}') # R0, R1, ...
    
    deflexion_reacc_sym = 0
    momentos_reacc_eq_sym = 0
    fuerzas_reacc_eq_sym = 0
    
    reacciones_coords = []
    
    for i, s in enumerate(soportes_input):
        r_pos = float(s['posicion'])
        reacciones_coords.append(r_pos)
        
        # Deflexión debida a reacción (tipo puntual)
        deflexion_reacc_sym += (R_sym[i] / 6) * (x_sym - r_pos)**3 * sp.Heaviside(x_sym - r_pos)
        
        # Equilibrio
        fuerzas_reacc_eq_sym += R_sym[i]
        momentos_reacc_eq_sym += R_sym[i] * r_pos

    deflexion_total_sym = deflexion_reacc_sym + c1*x_sym + c2
    ecuaciones = []

    # Compatibilidad (Deflexión 0 en soportes)
    for r_pos in reacciones_coords:
        idx = int(round(r_pos / paso))
        if idx >= len(y_num): idx = len(y_num) - 1
        val_carga = y_num[idx]
        ecuaciones.append(deflexion_total_sym.subs(x_sym, r_pos) + val_carga)

    # Equilibrio Global
    sum_f_cargas = sum([f[0] for f in fed_list])
    sum_m_cargas = sum([f[0] * f[1] for f in fed_list]) - momentos_aplicados
    
    ecuaciones.append(fuerzas_reacc_eq_sym + sum_f_cargas)
    ecuaciones.append(momentos_reacc_eq_sym + sum_m_cargas)
    
    # Resolver
    incognitas = list(R_sym) + [c1, c2]
    solucion = sp.solve(ecuaciones, incognitas)
    
    # 4. Construir Resultados para devolver
    resultados_reacciones = []
    
    # Sumar reacciones a los diagramas numéricos
    for i, s in enumerate(soportes_input):
        if R_sym[i] in solucion:
            r_val = float(solucion[R_sym[i]])
            r_pos = float(s['posicion'])
            
            v_num += singularidad_num(x_vec, r_pos, 0, r_val)
            M_num += singularidad_num(x_vec, r_pos, 1, r_val)
            
            resultados_reacciones.append({
                'id': i,
                'posicion': r_pos,
                'magnitud': round(r_val, 2),
                'tipo': s['tipo']
            })

    # 5. Generar Gráficos en Base64
    graficos_base64 = {}
    
    # Función auxiliar para plotear
    def plot_to_base64(x, y, titulo, color, ylabel):
        fig, ax = plt.subplots(figsize=(10, 4))
        ax.plot(x, y, 'k', linewidth=2)
        ax.fill_between(x, y, color=color, alpha=0.5)
        ax.set_title(titulo)
        ax.set_ylabel(ylabel)
        ax.set_xlabel('Posición (m)')
        ax.grid(True)
        ax.axhline(0, color='black', linewidth=1)
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    graficos_base64['cortante'] = plot_to_base64(x_vec, v_num, 'Diagrama de Fuerza Cortante', "#02436E", 'V [kN]')
    graficos_base64['momento'] = plot_to_base64(x_vec, M_num, 'Diagrama de Momento Flector', "#8A3410", 'M [kN.m]')

    return {
        "reacciones": resultados_reacciones,
        "graficos": graficos_base64
    }