clc
clear 
syms x c1 c2 real

%% Informacion del tipo de problema iniciales:
tiposReacciones = ["articulada", "libre", "empotrada"; ... %Tipo de union 
                    1, 1, 2];                           %grados de libertad

tiposCarga      = ["Puntual" , ...
                   "Distribuida-Rectangular",...
                   "Distribuida-Triangular 1",...
                   "Distribuida-Triangular 2",...
                   "Momento"];


%% Condiciones del problema
%longitud de la viga:
l = 10;
Sy = 25; %Esfuerzo de fluencia del acero estructural A-36
FS = 2; %Factor de seguridad asumido por el diseñador.
%Reacciones:

%Las reacciones estan organizadas por (coeficiente, distancia(m))

ra = [  0  ...                   %ubicación [m]
        tiposReacciones(1,1) ... %tipo de apoyo 
     ];

rb = [  5  ...                   %ubicación [m]
        tiposReacciones(1,1) ... %tipo de apoyo 
     ];

rc = [  10  ...                   %ubicación [m]
        tiposReacciones(1,3) ... %tipo de apoyo 
    ];



%Lista de reacciones
r = [ra; rc]; 
%------------------------------

%Fuerzas aplicadas
%%Las fuerzas estan organizadas por (magnitud, distancia(m))

fa = [ -10 ... %Magnitud  [kN]
        0  ... %Ubicacion [m]
        15  ... %final     [m]
        tiposCarga(2)...
     ];

fb = [ -5 ...%Magnitud   [kN]
        10   ...%Ubicacion [m] 
        0   ...%final     [m]
        tiposCarga(5)
     ];
fc = [ -80 ... %Magnitud  [kN]
        2 ... %Ubicacion [m]
        7  ... %final     [m]
        tiposCarga(2)
     ];


%% Nivel de indeterminación de la viga:
n = 0;  

for i = 1:length(r)
    idx = tiposReacciones(1,:) ==  r(i,2);
    n = n + double(tiposReacciones(2,idx));
end

disp("Grado de indeterminación: " + n)

%% Funcion para singularidad:
function v = singularidad(a,n,A,Longitud)
v = 0;
    for x = 0:0.01:Longitud
        if a > x
        v = [v 0];
        else 
        w1 = (A/factorial(n))*(x-a)^n;
        v = [v w1]; 
        end 
    end
v = v(2:end);
end

%% Procesamiento de las fuerzas:
f  = [fc];
a = min(double(r(:,1)));  % Distancia de la reaccion mas cercana al origen
paso = 0.01;

%Matrices para almacenar los resultados de singularidad:
y = zeros(1,size(0:paso:l,1)); %Vector de singularidad de deflexion
M = zeros(1,size(0:paso:l,1)); %Vector de singularidad de fuerza cortante
v = zeros(1,size(0:paso:l,1)); %Vector de singularidad de momento flector
theta = zeros(1,size(0:paso:l,1));
momentos = 0;                  %Variables para almacenar los momentos aplicados en la viga;

fed = zeros(size(f,1),2); % Matriz para guardar la informacion f sin tener que modificarla
for i = 1:size(f,1)
    if f(i,4) == tiposCarga(1)  %Puntual

        %Variables a utilizar:
        magnitud = double(f(i,1));     %Magnitud [kN]
        posicion = double(f(i,2)) - a; %Posicion para momento con respecto a un apoyo
        
        %Ecuacion de singularidad:
         %DEFLEXION:
        sing = singularidad(posicion,3,magnitud,l);

        %
        singTheta = singularidad(posicion,2,magnitud,l);

        %MOMENTO FLECTOR:
        singM = singularidad(posicion,1,magnitud,l);

        %FUERZA CORTANTE:
        singV = singularidad(posicion,0,magnitud,l);

        %Almacenamiento:
        fed(i,1) = magnitud;      
        fed(i,2) = posicion; 
        y = sing + y;
        M = singM + M;
        v = singV + v;
        theta = singTheta + theta;

    elseif f(i,4) == tiposCarga(2)  %Distribuida-Rectangular
        %Variables a utilizar:
        magnitud = double(f(i,1));   %w0
        inicio   = double(f(i,2));   %a1
        final    = double(f(i,3));   %a2
        longitudCarga = final - inicio; 
        
        %Ecuacion de singularidad:
        %DEFLEXION:
        sing = singularidad(inicio,4,magnitud,l) - singularidad(final,4,magnitud,l);

        %
        singTheta = singularidad(inicio,3,magnitud,l) - singularidad(final,3,magnitud,l);

        %MOMENTO FLECTOR:
        singM = singularidad(inicio,2,magnitud,l) - singularidad(final,2,magnitud,l);

        %FUERZA CORTANTE:
        singV = singularidad(inicio,1,magnitud,l) - singularidad(final,1,magnitud,l);

        %Almacenamiento:
        fed(i,1) = magnitud * longitudCarga;        %Pasar de una carga distribuida a una puntual.
        fed(i,2) = (inicio + (longitudCarga/2)) - a;%Posicion donde se aplico la carga

        y = sing + y;
        M = singM + M;
        v = singV + v;
        theta = singTheta + theta;
    elseif f(i,4) == tiposCarga(3)  %Distribuida-Triangular 1
        %Variables a utilizar:
        magnitud = double(f(i,1));   %w0
        inicio   = double(f(i,2));   %a1
        final    = double(f(i,3));   %a2
        longitudCarga = inicio - final; %b
        
        %Ecuacion de singularidad:

        %DEFLEXION
        sing = singularidad(inicio,5,magnitud,l)./longitudCarga ...
              -singularidad(final, 5,magnitud,l)./longitudCarga ...
              -singularidad(final, 4,magnitud,l);
        
        singTheta = singularidad(inicio,4,magnitud,l)./longitudCarga ...
                  -singularidad(final, 4,magnitud,l)./longitudCarga ...
                  -singularidad(final, 3,magnitud,l);

        %MOMENTO:
        singM = singularidad(inicio,3,magnitud,l)./longitudCarga ...
               -singularidad(final, 3,magnitud,l)./longitudCarga ...
               -singularidad(final, 2,magnitud,l);

        %Fuerza Cortante:
        singV = singularidad(inicio,2,magnitud,l)./longitudCarga ...
               -singularidad(final, 2,magnitud,l)./longitudCarga ...
               -singularidad(final, 1,magnitud,l);
        
        %Almacenamiento:
        fed(i,1) = magnitud * longitudCarga / 2;        %Pasar de una carga distribuida a una puntual.
        fed(i,2) = (inicio + (longitudCarga * (2/3))) - a;%Posicion donde se aplico la carga

        y = sing + y;
        M = singM + M;
        v = singV + v;
        theta = singTheta + theta;

    elseif f(i,4) == tiposCarga(4)  %Distribuida-Triangular 2
        %Variables a utilizar:
        magnitud = double(f(i,1));   %w0
        inicio   = double(f(i,2));   %a1
        final    = double(f(i,3));   %a2
        longitudCarga = inicio - final; %b
        
        %Ecuacion de singularidad:
        sing = singularidad(inicio,4,magnitud,l) ...
              -singularidad(inicio,5,magnitud,l)./longitudCarga ...
              +singularidad(final, 5,magnitud,l)./longitudCarga;
        
        %
        singTheta = singularidad(inicio,3,magnitud,l) ...
                  -singularidad(inicio,4,magnitud,l)./longitudCarga ...
                  +singularidad(final, 4,magnitud,l)./longitudCarga;
        %MOMENTO:
        singM =  singularidad(inicio,2,magnitud,l) ...
                -singularidad(inicio,3,magnitud,l)./longitudCarga ...
                +singularidad(final, 3,magnitud,l)./longitudCarga;

        %Fuerza Cortante:
        singV =  singularidad(inicio,1,magnitud,l) ...
                -singularidad(inicio,2,magnitud,l)./longitudCarga ...
                +singularidad(final, 2,magnitud,l)./longitudCarga;


        %Almacenamiento:
        fed(i,1) = magnitud * longitudCarga / 2;        %Pasar de una carga distribuida a una puntual.
        fed(i,2) = (inicio + (longitudCarga * (1/3))) - a;%Posicion donde se aplico la carga

        y = sing + y;
        M = singM + M;
        v = singV + v;
        theta = singTheta + theta;
    elseif f(i,4) == tiposCarga(5)  %Momento

        magnitud =  double(f(i,1));   %M0
        posicion =  double(f(i,2));   %a

        %Ecuacion de singularidad:
        sing = singularidad(posicion,2,magnitud,l);

        singTheta = singularidad(posicion,1,magnitud,l);

        %MOMENTO:
        singM =  singularidad(posicion,0,magnitud,l);

        %Almacenamiento:
        momentos = momentos + magnitud;
        y = sing + y;
        M = singM + M;
        theta = singTheta + theta;      
    end
end


%% Ecuaciones de singularidad simbólicas para las reacciones:


msim = c1 * x + c2; % Para almacenar la ecuacion:
MSIM = c1;
%Validacion del tipo de apoyo para calcular el momento:


var  = sym('R', [1 length(r)], 'real'); 
varM = sym('M', [1 length(r)], 'real');

varM1 = 0;
%Se haya la ecuacion general de singularidad simbolica para las reacciones:
for j = 1:length(r)
    if r(j,2) == tiposReacciones(1,3)
        posicion = double(r(j,1));

        %------------------------------DEFLEXION:--------------------------------
        %Momento:
        msim = (varM(j) / 24) * (x - posicion)^4 * heaviside(x - posicion) + msim;
        %Fuerza:
        msim = (var(j) / 6) * (x - posicion)^3 * heaviside(x - posicion) + msim;
        
        %------------------------------MOMENTO-----------------------------------
        %Momento:
        MSIM = (varM(j)/6) * (x - posicion)^3 * heaviside(x - posicion) + MSIM;
        %Fuerza:
        MSIM = (var(j)/2)  * (x - posicion)^2 * heaviside(x - posicion) + MSIM;

        varM1 = [varM1 varM(j)]; %Vector para almacenar las incognitas de Momento en empotramiento
    else
        posicion = double(r(j,1));

        %------------------------------DEFLEXION:--------------------------------
        msim = (var(j) / 6) * (x - posicion)^3 * heaviside(x - posicion) + msim; 

        %------------------------------MOMENTO-----------------------------------
        MSIM = (var(j)/2)  * (x - posicion)^2 * heaviside(x - posicion) + MSIM;
    end

end
varM1 = varM1(2:end);

%Determinacion del sistema de ecuaciones:
ec  = sym(zeros(length(r),1)); %Cantidad de ecuaciones 
ecM = 0;   %Condiciones de Frontera para momento

for i = 1:length(r)
    %Ecuaciones de deflexion en las condiciones de frontera:
    posicion = double(r(i,1));
    indice_vector = round(posicion/paso) + 1; 
    if indice_vector > length(y); indice_vector = length(y); end 
    ec(i,1)  = subs(msim,x,posicion) + y(indice_vector);
    
    %Ecuaciones del angulo de deflexion si existe empotramiento:
    if r(i,2) == tiposReacciones(1,3)
        ecM1 = subs(MSIM,x,posicion) + theta(indice_vector);
        ecM = [ecM ecM1];
    end 
end

ecM = ecM(2:end);

%Si es una condicion de doble empotramiento utiliza solo la segunda ecuacion para calcular la deformacion


% Construcción de la lista de incógnitas y del sistema a resolver

% var  -> vector de reacciones simbólicas (1 x number_of_reactions)
% varM1 -> vector con momentos de empotramiento (1 x number_of_empotrados), o [] si no hay

%Vacio si no existe empotramiento
if isequal(varM1, 0)
    varM1 = sym([]);
end

% Lista completa de incógnitas <<<<<<<<<<<<<<------------------------------------------
if length(ecM) == 2
    ecM = ecM(2);
    unk = [c1, c2, var(1)];
    numAdd = n - 3;
else
    unk = [c1, c2, var, varM];
    numAdd = n - 2;
end


% Sistema de ecuaciones: ec (condiciones de deflexion) y ecM (condiciones de momento si existen)
if isempty(varM1)
    ecuaciones = ec;             % solo condiciones de deflexion
else
    ecuaciones = [ec', ecM];    % concatena condiciones de deflexion y condiciones de momento
end

% Resolver todo junto (evita problemas de campos faltantes en sol)
sol = solve(ecuaciones==0, unk, 'ReturnConditions', false);

% Ahora construimos las ecuaciones adicionales (solo si se necesitan)

if numAdd > 0
    ecucionesAdicionales = sym(zeros(1, numAdd));
    for k = 1:numAdd
        nameVar = char(var(k));
        if isfield(sol, nameVar)
            ecucionesAdicionales(k) = sol.(nameVar) - var(k);
        else
            % Si por alguna razón no está resuelto, devolvemos la expresión simbólica
            ecucionesAdicionales(k) = sym([]); % o podrías poner: var(k) - var(k) para 0
        end
    end
else
    ecucionesAdicionales = sym([]);
end

%% Armado de ecuaciones:

fr =  sum(fed(:,1));                                %Termino independiente de la fuerza 
mr =  sum((fed(:,2)) .* fed(:,1)) +  momentos;   %Termino independiente del momento                  

%Sistema de ecuaciones provenientes de las condiciones de equilibrio
ec1 = sum(var) == -fr;
ec2 = (var * (double(r(:,1)) - a)) + varM1 == -mr;

%SOLUCION: si existe una union empotrada o no:
if varM1 == 0 
    sol = solve([ec1 ec2 ecucionesAdicionales==0] , var);
else 
    sol = solve([ec1 ec2 ecucionesAdicionales==0] , [var varM1]);
end


%Calculo de singularidad para las reacciones ya calculado:
for i = 1 : length(var)
    magnitud = double(sol.(char(var(i))));
    posicion = double(r(i,1));
    
    disp("R" + num2str(i) + " = " + num2str(magnitud,'%.2f'))
    v = v + singularidad(posicion, 0, magnitud, l);
    M = M + singularidad(posicion, 1, magnitud, l);
end 


%Calculo de singularidad para los momentos ya calculado si existe algun empotramiento:
j = 1;
for i = 1:length(r)
    if r(i,2) == tiposReacciones(1,3)
        magnitud = double(sol.(char(varM1(j))));
        posicion = double(r(i,1));
        disp("M" + num2str(i) + " = " + num2str(magnitud,'%.2f'))
        M = M - singularidad(posicion, 0, magnitud, l);
        j = j + 1;
    end
end

%% Puntos claves de los diagramas:
L    = 0:paso:l;

%Maximos y minimos 
Mmax   = max([max(M), min(M)]);
xMax   = L(find(M == Mmax));

%% Graficación:
tiledlayout(2,1)


%Diagrama de fuerza cortante:
nexttile
    plot(L,v,'black','LineWidth',3)
    hold on
    xline(xMax,"r--",LineWidth=2)
    title('Diagrama de Fuerza cortante')
    xline(0,LineWidth=2)
    yline(0,LineWidth=2)
    xlim([-0.5 l+1])
    xlabel('x[m]')
    ylabel('V[kN]')
    area(L,v,'FaceColor', "#0072BD", 'LineWidth', 2)
    grid on
    hold off

%Diagrama de momento flector
nexttile
    plot(L,M,'Color','black','LineWidth',4)
    hold on
    xline(xMax,"r--",LineWidth=2)
    title('Diagrama de Momento flector')
    xline(0,LineWidth=2)
    yline(0,LineWidth=2)
    xlim([-0.5 l+1])
    xlabel('x[m]')
    ylabel('M[kN.m]')
    area(L,M,'FaceColor',"#D95319")
    grid on

%% Analisis de esfuerzo de la viga:

% Determinacion del momento flector maximo:
Mmax = max([max(M), abs(min(M))]);

% Esfuerzo permisible:
Sigma_per = Sy / FS; 

% Modulo de seccion requerido (cm^3):
Sx_req = (Mmax * 100 / Sigma_per);

% Tipo de perfil a utilizar
perfil = ["WF", "HE", "S"];
perfilUtilizado = perfil(3);

% Carga de informacion segun el perfil
switch perfilUtilizado
    case "WF"
        T = readtable('./perfiles/WF.xlsx');
    case "HE"
        T = readtable('./perfiles/HE.xlsx');
    case "S"
        T = readtable('./perfiles/S.xlsx');
end

arregloPerfiles = table2struct(T);

Sx_tabla = arrayfun(@(x) str2double(x.Sx), arregloPerfiles);
Sx_tabla = num2cell(Sx_tabla);
[arregloPerfiles.Sx] = deal(Sx_tabla{:});

Ix_tabla = arrayfun(@(x) str2double(x.Ix), arregloPerfiles);
Ix_tabla = num2cell(Ix_tabla);
[arregloPerfiles.Ix] = deal(Ix_tabla{:});

A_tabla = arrayfun(@(x) str2double(x.A), arregloPerfiles);
A_tabla = num2cell(A_tabla);
[arregloPerfiles.A] = deal(A_tabla{:});

Peso_tabla = arrayfun(@(x) str2double(x.Peso), arregloPerfiles);
Peso_tabla = num2cell(Peso_tabla);
[arregloPerfiles.Peso] = deal(Peso_tabla{:});


% Seleccion de perfiles que cumplen
Sxx = [arregloPerfiles.Sx];
posicion = find(Sxx >= Sx_req, 10);

tablaResultados = struct2table(arregloPerfiles(posicion));



