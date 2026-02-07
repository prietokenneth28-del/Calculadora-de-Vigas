clc
clear 
syms x c1 c2

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
l = 12;
%Reacciones:

%Las reacciones estan organizadas por (coeficiente, distancia(m))

ra = [  0  ...                   %ubicación [m]
        tiposReacciones(1,1) ... %tipo de apoyo 
     ];

rb = [  6  ...                   %ubicación [m]
        tiposReacciones(1,1) ... %tipo de apoyo 
     ];

rc = [  9  ...                   %ubicación [m]
        tiposReacciones(1,1) ... %tipo de apoyo 
    ];

rd = [  12  ...                   %ubicación [m]
        tiposReacciones(1,1) ... %tipo de apoyo 
    ];


%Lista de reacciones
r = [ra; rb; rc; rd]; 
%------------------------------

%Fuerzas aplicadas
%%Las fuerzas estan organizadas por (magnitud, distancia(m))

fa = [ -12 ... %Magnitud  [kN]
        3  ... %Ubicacion [m]
        0  ... %final     [m]
        tiposCarga(1)...
     ];

fb = [ -50 ...%Magnitud   [kN]
        6   ...%Ubicacion [m] 
        9   ...%final     [m]
        tiposCarga(2)
     ];
fc = [ -12 ... %Magnitud  [kN]
        11 ... %Ubicacion [m]
        0  ... %final     [m]
        tiposCarga(1)
     ];

Mc = [ -12 ... %Magnitud  [kN]
        11 ... %Ubicacion [m]
        0  ... %final     [m]
        tiposCarga(5)
     ];

%% Nivel de indeterminación de la viga:
n = 0;  

for i = 1:length(r)
    idx = tiposReacciones(1,:) ==  r(i,2);
    n = n + double(tiposReacciones(2,idx));
end

disp("Grado de indeterminación: " + n)

%% Funcion para singularidad:
function v = singularidad(a,e,A,Longitud)
v = 0;
    for x = 0:0.01:Longitud
        w1 = (A/factorial(e)) * (x - a)^e * heaviside(x - a);
        v = [v w1]; 
    end
v = v(2:end);
end

%% Procesamiento de las fuerzas:
f  = [fa; fb; fc; Mc];
a = min(double(r(:,1)));  % Distancia de la reaccion mas cercana al origen
paso = 0.01;

%Matrices para almacenar los resultados de singularidad:
y = zeros(1,size(0:paso:l,1)); %Vector de singularidad de deflexion
M = zeros(1,size(0:paso:l,1)); %Vector de singularidad de fuerza cortante
v = zeros(1,size(0:paso:l,1)); %Vector de singularidad de momento flector
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
    
    elseif f(i,4) == tiposCarga(2)  %Distribuida-Rectangular
        %Variables a utilizar:
        magnitud = double(f(i,1));   %w0
        inicio   = double(f(i,2));   %a1
        final    = double(f(i,3));   %a2
        longitudCarga = final - inicio; 
        
        %Ecuacion de singularidad:
        %DEFLEXION:
        sing = singularidad(inicio,4,magnitud,l) - singularidad(final,4,magnitud,l);

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

    elseif f(i,4) == tiposCarga(5)  %Momento

        magnitud =  double(f(i,1));   %M0
        posicion =  double(f(i,2));   %a

        %Ecuacion de singularidad:
        sing = singularidad(posicion,2,magnitud,l);

        %MOMENTO:
        singM =  singularidad(posicion,0,magnitud,l);

        %Almacenamiento:
        momentos = momentos + magnitud;
        y = sing + y;
        M = singM + M;
              
    end
end


%% Ecuaciones de singularidad simbólicas para las reacciones:


msim = 0; % Para almacenar la ecuacion:
var  = sym('R', [1 length(r)]);

%Se haya la ecuacion general de singularidad simbolica para las reacciones:
for j = 1:length(r)
    posicion = double(r(j,1));
    msim = (var(j)/6) * (x - posicion)^3 * heaviside(x - posicion) + msim; 
end

msim = msim + c1 * x + c2;

%Determinacion del sistema de ecuaciones:
ec = sym(zeros(length(r),1));

for i = 1:length(r)
    posicion = double(r(i,1));
    indice_vector = round(posicion/paso) + 1; 
    if indice_vector > length(y); indice_vector = length(y); end 
    ec(i,1)  = subs(msim,x,posicion) + y(indice_vector);
end

% Para despejar el numero de ecuaciones necesarias para resolver la indeterminación
unk = [c1 c2 var(1:n-2)];
sol = solve(ec, unk, 'ReturnConditions', false);

%%% --------------------automarizar esto-------------------------

ecucionesAdicionales = sym('eq', [1 n-2]);
j = 1;
for i = 1 : n - 2
    ecucionesAdicionales(i) = sol.(char(var(j))) - var(j);
    j = j + 1; 
end

%% Armado de ecuaciones:

fr =  sum(fed(:,1));                                %Termino independiente de la fuerza 
mr =  sum((fed(:,2) - a) .* fed(:,1)) + momentos;   %Termino independiente del momento                  

%Sistema de ecuaciones provenientes de las condiciones de equilibrio
ec1 = sum(var) == -fr;
ec2 = var * (double(r(:,1)) - a) == -mr;


%SOLUCION:
sol = solve([ec1 ec2 ecucionesAdicionales==0] , var);


for i = 1:n
    magnitud = double(sol.(char(var(i))));
    posicion = double(r(i,1));

    v = v + singularidad(posicion, 0, magnitud, l);
    M = M + singularidad(posicion, 1, magnitud, l);
end 

tiledlayout(2,1)

L = 0:paso:l;
%Diagrama de fuerza cortante:
nexttile
    plot(L,v,'black','LineWidth',3)
    hold on
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
    title('Diagrama de Momento flector')
    xline(0,LineWidth=2)
    yline(0,LineWidth=2)
    xlim([-0.5 l+1])
    xlabel('x[m]')
    ylabel('M[kN.m]')
    area(L,M,'FaceColor',"#D95319")
    grid on