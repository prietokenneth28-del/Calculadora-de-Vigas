import numpy as np
import sympy as sp
import matplotlib.pyplot as plt
from math import factorial

# --- FUNCIÓN CORREGIDA ---
def singularidad_num(x_vals, a, e, A):
    """
    Función de singularidad numérica robusta (Macaulay).
    Calcula (A/e!) * <x-a>^e
    CORRECCIÓN: Se asegura de devolver 0 si x < a, especialmente crítico para e=0.
    """
    # 1. Crear máscara Heaviside: 1 si x >= a, 0 si x < a
    # Esto es el 'interruptor' que apaga la función antes de 'a'
    heaviside = np.where(x_vals >= a, 1.0, 0.0)
    
    # 2. Término base (x-a)
    term = np.maximum(0.0, x_vals - a)
    
    # 3. Cálculo del valor
    if e == 0:
        # CASO CRÍTICO (CORTANTE): (x-a)^0 es 1. Debemos multiplicar explícitamente por heaviside.
        # Sin esto, Python calcula term**0 = 1 incluso donde debería ser 0.
        val = A * heaviside
    else:
        # Para e > 0, term**e ya da 0 si term es 0, así que es seguro.
        val = (A / factorial(e)) * (term ** e)
    
    return val

# --- Configuración Inicial ---
l = 12.0  
paso = 0.01
x_vec = np.arange(0, l + paso, paso)

# Definición de tipos
TIPO_PUNTUAL = 0
TIPO_DIST_RECT = 1
TIPO_DIST_TRI_1 = 2
TIPO_DIST_TRI_2 = 3

# --- Definición del Problema ---
reacciones_coords = [0, 6, 9, 12] # Posiciones de apoyos

# Fuerzas aplicadas (USANDO TUS DATOS CORREGIDOS)
# Asegúrate de que 'final' en la carga distribuida sea correcto (ej. 12)
cargas = [
    [-12, 3,  0, TIPO_PUNTUAL],
    [-50, 6, 9, TIPO_DIST_RECT],  # <--- Verifica que este '12' coincida con tu corrección
    [-12, 11, 0, TIPO_PUNTUAL]
]

# Inicialización de vectores
y_num = np.zeros_like(x_vec)
M_num = np.zeros_like(x_vec)
v_num = np.zeros_like(x_vec)
f_equiv_list = []
a_offset = min(reacciones_coords)

# --- Procesamiento de Cargas ---
for carga in cargas:
    mag, inicio, final, tipo = carga
    
    if tipo == TIPO_PUNTUAL:
        pos = inicio - a_offset
        y_num += singularidad_num(x_vec, pos, 3, mag)
        M_num += singularidad_num(x_vec, pos, 1, mag)
        v_num += singularidad_num(x_vec, pos, 0, mag) # Aquí fallaba antes por el e=0
        f_equiv_list.append([mag, pos])
        
    elif tipo == TIPO_DIST_RECT:
        longitud_carga = final - inicio 
        # Deflexión
        y_num += singularidad_num(x_vec, inicio, 4, mag) - singularidad_num(x_vec, final, 4, mag)
        # Momento
        M_num += singularidad_num(x_vec, inicio, 2, mag) - singularidad_num(x_vec, final, 2, mag)
        # Cortante
        v_num += singularidad_num(x_vec, inicio, 1, mag) - singularidad_num(x_vec, final, 1, mag)
        
        f_eq = mag * longitud_carga
        pos_eq = (inicio + longitud_carga/2) - a_offset
        f_equiv_list.append([f_eq, pos_eq])

    # (Agrega aquí los bloques ELIF para triangulares si los necesitas, usando la misma lógica)

# --- Resolución Simbólica ---
x_sym, c1, c2 = sp.symbols('x c1 c2')
num_reacciones = len(reacciones_coords)
R_sym = sp.symbols(f'R0:{num_reacciones}')

deflexion_reacciones_sym = 0
momentos_reacciones_eq_sym = 0
fuerzas_reacciones_eq_sym = 0

for i, r_pos in enumerate(reacciones_coords):
    # Ecuaciones simbólicas para solver
    term = (R_sym[i] / 6) * (x_sym - r_pos)**3 * sp.Heaviside(x_sym - r_pos)
    deflexion_reacciones_sym += term
    momentos_reacciones_eq_sym += R_sym[i] * (r_pos - a_offset)
    fuerzas_reacciones_eq_sym += R_sym[i]

deflexion_total_sym = deflexion_reacciones_sym + c1*x_sym + c2
ecuaciones = []

# Compatibilidad (Deflexión 0 en apoyos)
for r_pos in reacciones_coords:
    idx = int(round(r_pos / paso))
    if idx >= len(y_num): idx = len(y_num) - 1
    ecuaciones.append(deflexion_total_sym.subs(x_sym, r_pos) + y_num[idx])

# Equilibrio
suma_fuerzas = sum([fe[0] for fe in f_equiv_list])
suma_momentos = sum([fe[0] * fe[1] for fe in f_equiv_list])
sistema = ecuaciones + [fuerzas_reacciones_eq_sym + suma_fuerzas, 
                        momentos_reacciones_eq_sym + suma_momentos]

solucion = sp.solve(sistema, list(R_sym) + [c1, c2])

# --- Actualizar Diagramas con Reacciones ---
for i, r_pos in enumerate(reacciones_coords):
    r_val = float(solucion[R_sym[i]])
    # AQUI ESTABA EL ERROR: Al sumar la reacción al cortante (e=0)
    v_num += singularidad_num(x_vec, r_pos, 0, r_val) 
    M_num += singularidad_num(x_vec, r_pos, 1, r_val)
    y_num += singularidad_num(x_vec, r_pos, 3, r_val)

# --- Gráficas ---
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex=True)

# Cortante
ax1.plot(x_vec, v_num, 'k', linewidth=2)
ax1.fill_between(x_vec, v_num, color="#0072BD", alpha=0.5)
ax1.set_title('Diagrama de Fuerza Cortante (Corregido)')
ax1.set_ylabel('V [kN]')
ax1.grid(True)
ax1.axhline(0, color='black')

# Momento
ax2.plot(x_vec, M_num, 'k', linewidth=2)
ax2.fill_between(x_vec, M_num, color="#D95319", alpha=0.5)
ax2.set_title('Diagrama de Momento Flector')
ax2.set_xlabel('x [m]')
ax2.set_ylabel('M [kN.m]')
ax2.grid(True)
ax2.axhline(0, color='black')

plt.tight_layout()
plt.show()